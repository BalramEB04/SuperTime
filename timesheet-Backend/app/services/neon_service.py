import httpx
from typing import Dict, Any, Optional
from jose import jwt, jwk
from jose.utils import base64url_decode
from app.core.config import settings
from app.core.logger import logger


class NeonIntegrationService:
    def __init__(self):
        self.auth_base_url = settings.NEON_AUTH_BASE_URL
        self.auth_jwks_url = settings.NEON_AUTH_JWKS_URL
        self.function_hello_url = settings.NEON_FUNCTION_HELLO_BASE_URL
        self.realtime_url = settings.NEON_REALTIME_URL
        self.realtime_secret = settings.NEON_REALTIME_SECRET

    async def invoke_hello_function(self) -> Dict[str, Any]:
        """Calls the deployed Neon Function."""
        if not self.function_hello_url:
            raise RuntimeError("NEON_FUNCTION_HELLO_BASE_URL is not set.")

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(self.function_hello_url)
            return {
                "status_code": resp.status_code,
                "body": resp.text,
                "url": self.function_hello_url,
            }

    async def get_jwks(self) -> Dict[str, Any]:
        """Fetches the JWKS keys from Neon Auth."""
        if not self.auth_jwks_url:
            raise RuntimeError("NEON_AUTH_JWKS_URL is not set.")

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(self.auth_jwks_url)
            resp.raise_for_status()
            return resp.json()

    def get_realtime_config(self) -> Dict[str, Any]:
        """Returns Neon Realtime configuration (sanitizing secret)."""
        return {
            "realtime_url": self.realtime_url,
            "configured": bool(self.realtime_url and self.realtime_secret),
            "branch": settings.NEON_BRANCH,
        }


neon_service = NeonIntegrationService()

