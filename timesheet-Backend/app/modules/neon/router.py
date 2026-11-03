from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.core.database import get_db
from app.core.config import settings
from app.services.storage_service import storage_service
from app.services.neon_service import neon_service

router = APIRouter()


@router.get("/status")
async def get_neon_services_status(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Tests and returns the live status of all wired Neon services."""
    results = {}

    # 1. Postgres Database check
    try:
        db_res = await db.execute(text("SELECT 1"))
        results["postgres"] = {
            "status": "healthy" if db_res.scalar() == 1 else "unexpected_result",
            "branch": settings.NEON_BRANCH,
        }
    except Exception as e:
        results["postgres"] = {"status": "error", "error": str(e)}

    # 2. Object Storage check
    try:
        objects = storage_service.list_objects()
        results["object_storage"] = {
            "status": "healthy",
            "bucket": settings.NEON_STORAGE_BUCKET,
            "object_count": len(objects),
        }
    except Exception as e:
        results["object_storage"] = {"status": "error", "error": str(e)}

    # 3. Neon Function check
    try:
        fn_res = await neon_service.invoke_hello_function()
        results["functions"] = {
            "status": "healthy" if fn_res["status_code"] == 200 else "unexpected_status",
            "response": fn_res["body"],
        }
    except Exception as e:
        results["functions"] = {"status": "error", "error": str(e)}

    # 4. Neon Auth check
    try:
        jwks = await neon_service.get_jwks()
        results["auth"] = {
            "status": "healthy",
            "keys_count": len(jwks.get("keys", [])),
        }
    except Exception as e:
        results["auth"] = {"status": "error", "error": str(e)}

    # 5. Neon Realtime check
    rt_config = neon_service.get_realtime_config()
    results["realtime"] = {
        "status": "configured" if rt_config["configured"] else "missing_credentials",
        "url": rt_config["realtime_url"],
    }

    return {
        "neon_branch": settings.NEON_BRANCH,
        "services": results,
    }


@router.post("/storage/upload")
async def upload_file_to_neon_storage(file: UploadFile = File(...)):
    """Uploads a file to Neon Object Storage bucket."""
    content = await file.read()
    res = storage_service.upload_file(
        content=content,
        key=f"uploads/{file.filename}",
        content_type=file.content_type or "application/octet-stream",
    )
    presigned = storage_service.generate_presigned_url(res["key"], expires_in=1800)
    return {
        "status": "uploaded",
        "file": res,
        "presigned_download_url": presigned,
    }


@router.get("/storage/files")
def list_neon_storage_files():
    """Lists files currently in the Neon Object Storage bucket."""
    files = storage_service.list_objects()
    return {"bucket": settings.NEON_STORAGE_BUCKET, "files": files}


@router.get("/functions/hello")
async def call_neon_function():
    """Calls the Neon Serverless Function."""
    return await neon_service.invoke_hello_function()


@router.get("/auth/jwks")
async def get_neon_auth_jwks():
    """Fetches Neon Auth JWKS public keys."""
    return await neon_service.get_jwks()


@router.get("/realtime/info")
def get_neon_realtime_info():
    """Returns Realtime connection information."""
    return neon_service.get_realtime_config()

