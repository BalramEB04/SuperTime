from typing import Optional, List, Dict, Any
import boto3
from botocore.client import Config
from app.core.config import settings
from app.core.logger import logger


class NeonStorageService:
    def __init__(self):
        self.endpoint_url = settings.AWS_ENDPOINT_URL_S3
        self.access_key_id = settings.AWS_ACCESS_KEY_ID
        self.secret_access_key = settings.AWS_SECRET_ACCESS_KEY
        self.region = settings.AWS_REGION
        self.bucket = settings.NEON_STORAGE_BUCKET

    def get_client(self):
        if not self.endpoint_url or not self.access_key_id or not self.secret_access_key:
            return None
        return boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name=self.region,
            config=Config(s3={"addressing_style": "path"}),
        )

    def upload_file(self, content: bytes, key: str, content_type: str = "application/octet-stream") -> Dict[str, Any]:
        client = self.get_client()
        if not client:
            raise RuntimeError("Neon Object Storage is not configured with credentials.")

        client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=content,
            ContentType=content_type,
        )
        return {
            "bucket": self.bucket,
            "key": key,
            "size": len(content),
            "url": f"{self.endpoint_url}/{self.bucket}/{key}",
        }

    def get_file(self, key: str) -> bytes:
        client = self.get_client()
        if not client:
            raise RuntimeError("Neon Object Storage is not configured with credentials.")

        response = client.get_object(Bucket=self.bucket, Key=key)
        return response["Body"].read()

    def generate_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        client = self.get_client()
        if not client:
            raise RuntimeError("Neon Object Storage is not configured with credentials.")

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


storage_service = NeonStorageService()

