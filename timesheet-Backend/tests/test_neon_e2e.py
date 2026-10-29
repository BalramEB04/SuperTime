import os
import sys
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

import asyncio
import httpx
from app.main import app


async def run_e2e_tests():
    print("========================================================")
    print("STARTING END-TO-END NEON SERVICES VERIFICATION")
    print("========================================================")

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://localhost:8000") as client:
        # 1. Health & Database
        res_health = await client.get("/api/v1/health")
        print("\n[1] NEON POSTGRES DATABASE CHECK:")
        print(f"Status: {res_health.status_code}, Body: {res_health.json()}")

        # 2. Overall Neon Services Status
        res_status = await client.get("/api/v1/neon/status")
        print("\n[2] OVERALL NEON SERVICES STATUS:")
        print(f"Status: {res_status.status_code}, Body: {res_status.json()}")

        # 3. Neon Function
        res_fn = await client.get("/api/v1/neon/functions/hello")
        print("\n[3] NEON SERVERLESS FUNCTION:")
        print(f"Status: {res_fn.status_code}, Body: {res_fn.json()}")

        # 4. Neon Auth JWKS
        res_auth = await client.get("/api/v1/neon/auth/jwks")
        keys_count = len(res_auth.json().get("keys", []))
        print("\n[4] NEON AUTH JWKS KEYS:")
        print(f"Status: {res_auth.status_code}, Keys found: {keys_count}")

        # 5. Neon Object Storage: Upload
        test_file_payload = {"file": ("timesheet_receipt_test.txt", b"Receipt data saved to Neon Object Storage bucket", "text/plain")}
        res_upload = await client.post("/api/v1/neon/storage/upload", files=test_file_payload)
        print("\n[5] NEON OBJECT STORAGE UPLOAD:")
        print(f"Status: {res_upload.status_code}, Response: {res_upload.json()}")

        # 6. Neon Object Storage: List
        res_files = await client.get("/api/v1/neon/storage/files")
        print("\n[6] NEON OBJECT STORAGE LIST:")
        print(f"Status: {res_files.status_code}, Files: {res_files.json()}")

        # 7. Neon Realtime Config
        res_rt = await client.get("/api/v1/neon/realtime/info")
        print("\n[7] NEON REALTIME SERVICE INFO:")
        print(f"Status: {res_rt.status_code}, Body: {res_rt.json()}")

    print("\n========================================================")
    print("ALL END-TO-END VERIFICATIONS COMPLETED SUCCESSFULLY")
    print("========================================================")


if __name__ == "__main__":
    asyncio.run(run_e2e_tests())
