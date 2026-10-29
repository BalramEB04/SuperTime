from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.responses import success_response
from app.core.config import settings
from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.modules.auth.service import (
    login_with_google,
    refresh_access_token,
)
from app.modules.users.model import User

router = APIRouter()

# In production (Vercel + Render cross-site), cookies MUST be Secure + SameSite=None.
# Locally (same-origin via Vite proxy) SameSite=lax works without HTTPS.
_IS_PRODUCTION = settings.ENVIRONMENT == "production"
_COOKIE_SAMESITE = "none" if _IS_PRODUCTION else "lax"


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=_IS_PRODUCTION,
        samesite=_COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=_IS_PRODUCTION,
        samesite=_COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )


def clear_auth_cookies(response: Response):
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=_IS_PRODUCTION,
        samesite=_COOKIE_SAMESITE,
        path="/",
    )
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=_IS_PRODUCTION,
        samesite=_COOKIE_SAMESITE,
        path="/",
    )


class GoogleLoginRequest(BaseModel):
    credential: str = Field(..., description="Google ID Token JWT from Google Identity Services")


@router.post("/google/login", summary="Login using Google SSO")
async def google_login(request: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Exchanges a Google ID Token for JWT access and refresh tokens.
    User must already be registered in the database by an Admin.
    """
    auth_data = await login_with_google(request.credential, db)
    resp = success_response(
        data={
            "access_token": auth_data.access_token,
            "refresh_token": auth_data.refresh_token,
            "token_type": "bearer",
            "user": auth_data.user.model_dump(),
        },
        message="Login successful",
    )

    set_auth_cookies(resp, auth_data.access_token, auth_data.refresh_token)
    return resp


@router.post("/refresh", summary="Refresh access token")
async def refresh_token(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Exchanges a valid refresh token for a new access token and refresh token.
    Supports reading refresh_token from cookies or JSON body.
    """
    token = request.cookies.get("refresh_token")
    if not token:
        try:
            body = await request.json()
            if isinstance(body, dict):
                token = body.get("refresh_token")
        except Exception:
            token = None

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )
    auth_data = await refresh_access_token(token, db)
    resp = success_response(
        data={
            "access_token": auth_data.access_token,
            "refresh_token": auth_data.refresh_token,
            "token_type": "bearer",
            "user": auth_data.user.model_dump(),
        },
        message="Token refreshed successfully",
    )
    set_auth_cookies(resp, auth_data.access_token, auth_data.refresh_token)
    return resp


@router.post("/logout", summary="Logout user")
async def logout():
    """
    Stateless logout: Instructs the client to discard their tokens.
    """
    resp = success_response(
        data=None,
        message="Successfully logged out.",
    )
    clear_auth_cookies(resp)
    return resp


@router.get("/me", summary="Get authenticated user profile")
async def get_me(current_user: User = Depends(get_current_active_user)):
    """
    Returns the currently authenticated user's profile.
    Can be used by the frontend on page load to verify the session.
    """
    role = getattr(current_user, "role", None)
    role_name = role.name if role and hasattr(role, "name") else "Employee"
    
    joining_date = getattr(current_user, "joining_date", None)
    created_at = getattr(current_user, "created_at", None)

    user_data = {
        "id": current_user.id,
        "employee_id": getattr(current_user, "employee_id", None) or f"EMP-{current_user.id:03d}",
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "role": role_name,
        "role_id": current_user.role_id,
        "department_id": getattr(current_user, "department_id", None),
        "status": getattr(current_user, "status", "Active"),
        "joining_date": joining_date.isoformat() if joining_date else None,
        "created_at": created_at.isoformat() if created_at else None,
    }
    return success_response(data=user_data, message="User profile retrieved successfully")
