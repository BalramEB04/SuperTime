from typing import Optional, List, Dict, Any
import boto3
from botocore.client import Config
from app.core.config import settings
from app.core.logger import logger


class ObjectStorageService:
    """
    S3-compatible Object Storage Service.
    Works seamlessly with Neon Object Storage and AWS S3 (when deploying with AWS RDS).
    """

    def __init__(self):
        self.endpoint_url = settings.AWS_ENDPOINT_URL_S3
        self.access_key_id = settings.AWS_ACCESS_KEY_ID
        self.secret_access_key = settings.AWS_SECRET_ACCESS_KEY
        self.region = settings.AWS_REGION or "us-east-1"
        self.bucket = settings.NEON_STORAGE_BUCKET or "assets"

    @property
    def is_configured(self) -> bool:
        """Returns True if AWS/Neon credentials are configured."""
        return bool(self.access_key_id and self.secret_access_key)

    def get_client(self):
        if not self.is_configured:
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
        client = self.get_client()
        if not client:
            raise RuntimeError("Object Storage is not configured with AWS/Neon credentials.")

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
        client = self.get_client()
        if not client:
            raise RuntimeError("Object Storage is not configured with AWS/Neon credentials.")

        response = client.get_object(Bucket=self.bucket, Key=key)
        return response["Body"].read()

    def delete_file(self, key: str) -> bool:
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
