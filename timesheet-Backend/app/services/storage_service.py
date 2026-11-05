from typing import Optional, List, Dict, Any
import boto3
import httpx
from botocore.client import Config
from app.core.config import settings
from app.core.logger import logger


class VercelBlobService:
    """
    Client for Vercel Blob Object Storage using REST API.
    Supports both private and public stores.
    """

    def __init__(self):
        self.token = settings.BLOB_READ_WRITE_TOKEN or settings.VERCEL_BLOB_READ_WRITE_TOKEN

    @property
    def is_configured(self) -> bool:
        return bool(self.token and self.token.strip())

    def upload_file(self, content: bytes, key: str, content_type: str = "application/octet-stream") -> Dict[str, Any]:
        if not self.is_configured:
            raise RuntimeError("Vercel Blob token is not configured.")

        clean_key = key.lstrip("/")
        url = f"https://blob.vercel-storage.com/{clean_key}"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "x-api-version": "7",
            "x-vercel-blob-access": "private",
            "Content-Type": content_type,
        }
        with httpx.Client(timeout=60.0) as client:
            resp = client.put(url, content=content, headers=headers)
            if resp.status_code not in (200, 201):
                logger.error(f"Vercel Blob upload failed ({resp.status_code}): {resp.text}")
                raise RuntimeError(f"Vercel Blob upload failed: {resp.text}")
            data = resp.json()
            return {
                "bucket": "vercel-blob",
                "key": clean_key,
                "size": len(content),
                "url": data.get("url"),
                "downloadUrl": data.get("downloadUrl"),
            }

    def delete_file(self, url: str) -> bool:
        if not self.is_configured or not url:
            return False
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post("https://blob.vercel-storage.com/delete", json={"urls": [url]}, headers=headers)
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"Failed to delete Vercel Blob at {url}: {e}")
            return False

    def stream_file(self, url: str):
        """Streams a private blob using the authorization token."""
        headers = {"Authorization": f"Bearer {self.token}"}
        client = httpx.Client(timeout=60.0)
        req = client.build_request("GET", url, headers=headers)
        resp = client.send(req, stream=True)
        return resp, client


vercel_blob_service = VercelBlobService()


class ObjectStorageService:
    """
    Unified Object Storage Service.
    Supports Vercel Blob, S3-compatible Neon Object Storage, and AWS S3.
    """

    def __init__(self):
        self.endpoint_url = settings.AWS_ENDPOINT_URL_S3
        self.access_key_id = settings.AWS_ACCESS_KEY_ID
        self.secret_access_key = settings.AWS_SECRET_ACCESS_KEY
        self.region = settings.AWS_REGION or "us-east-1"
        self.bucket = settings.NEON_STORAGE_BUCKET or "assets"

    @property
    def is_configured(self) -> bool:
        """Returns True if Vercel Blob or AWS/Neon credentials are configured."""
        return vercel_blob_service.is_configured or bool(self.access_key_id and self.secret_access_key)

    def get_client(self):
        if not (self.access_key_id and self.secret_access_key):
            return None
        
        kwargs: Dict[str, Any] = {
            "service_name": "s3",
            "aws_access_key_id": self.access_key_id,
            "aws_secret_access_key": self.secret_access_key,
            "region_name": self.region,
        }
        # If a custom endpoint URL is provided (e.g. Neon Object Storage, MinIO), use it with path-style addressing.
        # Otherwise, boto3 defaults to standard AWS S3 endpoints.
        if self.endpoint_url:
            kwargs["endpoint_url"] = self.endpoint_url
            kwargs["config"] = Config(s3={"addressing_style": "path"})

        return boto3.client(**kwargs)

    def upload_file(self, content: bytes, key: str, content_type: str = "application/octet-stream") -> Dict[str, Any]:
        if vercel_blob_service.is_configured:
            return vercel_blob_service.upload_file(content, key, content_type)

        client = self.get_client()
        if not client:
            raise RuntimeError("Object Storage is not configured with AWS/Neon or Vercel Blob credentials.")

        client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=content,
            ContentType=content_type,
        )
        url = (
            f"{self.endpoint_url}/{self.bucket}/{key}"
            if self.endpoint_url
            else f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{key}"
        )
        return {
            "bucket": self.bucket,
            "key": key,
            "size": len(content),
            "url": url,
        }

    def get_file(self, key: str) -> bytes:
        if vercel_blob_service.is_configured and key.startswith("http"):
            resp, client = vercel_blob_service.stream_file(key)
            try:
                if resp.status_code == 200:
                    return resp.read()
                raise RuntimeError(f"Failed to fetch from Vercel Blob: {resp.status_code}")
            finally:
                resp.close()
                client.close()

        client = self.get_client()
        if not client:
            raise RuntimeError("Object Storage is not configured with AWS/Neon or Vercel Blob credentials.")

        response = client.get_object(Bucket=self.bucket, Key=key)
        return response["Body"].read()

    def delete_file(self, key: str) -> bool:
        if vercel_blob_service.is_configured and ("blob.vercel-storage.com" in key or key.startswith("http")):
            return vercel_blob_service.delete_file(key)

        client = self.get_client()
        if not client:
            return False
        try:
            client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception as e:
            logger.error(f"Failed to delete {key} from storage: {e}")
            return False

    def generate_presigned_url(self, key: str, expires_in: int = 86400) -> str:
        """Generates a presigned GET URL valid for the specified duration (default: 24 hours)."""
        client = self.get_client()
        if not client:
            raise RuntimeError("Object Storage is not configured with AWS/Neon credentials.")

        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    def list_objects(self, prefix: str = "") -> List[str]:
        client = self.get_client()
        if not client:
            return []

        resp = client.list_objects_v2(Bucket=self.bucket, Prefix=prefix)
        return [item["Key"] for item in resp.get("Contents", [])]


# Aliases for compatibility
NeonStorageService = ObjectStorageService
storage_service = ObjectStorageService()
