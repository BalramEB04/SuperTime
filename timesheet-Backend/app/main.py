import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure project root is in sys.path when running in serverless environments (e.g. Vercel)
_project_root = str(Path(__file__).resolve().parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import app.core.models  # noqa: F401
from app.api.router import api_router
from app.common.responses import error_response
from app.core.config import settings
# Background scheduler removed per configuration
# from app.scheduler.scheduler import ...

logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Background scheduler disabled/removed
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
    lifespan=lifespan,
)


def format_validation_error(exc: RequestValidationError) -> str:
    """Extracts a clean, single-sentence human-readable error message from validation errors."""
    errors = exc.errors()
    if not errors:
        return "Invalid input provided. Please check the entered data."

    first_err = errors[0]
    msg = first_err.get("msg", "")

    # Strip raw python validator prefixes
    if msg.startswith("Value error, "):
        msg = msg[len("Value error, "):]
    elif msg.startswith("Assertion failed, "):
        msg = msg[len("Assertion failed, "):]

    # Clean field name
    loc = first_err.get("loc", ())
    field_name = str(loc[-1]) if loc else ""
    field_clean = field_name.replace("_", " ").capitalize() if field_name else "Field"

    if msg.lower() == "field required":
        return f"{field_clean} is required."
    if "input should be a valid" in msg.lower():
        return f"Please enter a valid {field_clean.lower()}."

    return msg[0].upper() + msg[1:] if msg else "Invalid data provided."


# Exception handlers for standardized API response contract
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    # Clean string representation of detail
    detail = exc.detail
    if isinstance(detail, list) and detail:
        clean_msg = str(detail[0].get("msg", detail[0]) if isinstance(detail[0], dict) else detail[0])
    elif isinstance(detail, dict):
        clean_msg = detail.get("message") or detail.get("detail") or "Request could not be processed."
    else:
        clean_msg = str(detail)

    return error_response(
        message=clean_msg,
        status_code=exc.status_code,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    user_friendly_msg = format_validation_error(exc)
    formatted_errors = []
    for err in exc.errors():
        loc = err.get("loc", ())
        field_name = str(loc[-1]) if loc else "general"
        formatted_errors.append({"field": field_name, "message": err.get("msg", "")})

    return error_response(
        message=user_friendly_msg,
        errors=formatted_errors,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    return error_response(
        message="Unable to complete this request right now. Please try again.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.FRONTEND_URLS,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles

# Setup uploads directory safely (/tmp on serverless environments where root is read-only)
uploads_dir = Path("/tmp/uploads" if (os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")) else "uploads")
try:
    uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")
except (OSError, PermissionError) as e:
    logger.warning(f"Could not mount static uploads directory: {e}")

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
    }
