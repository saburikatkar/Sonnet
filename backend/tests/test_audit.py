import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_jobs_pagination_validation():
    # Test valid pagination
    response = client.get("/api/v1/jobs?skip=0&limit=10")
    assert response.status_code == 200

    # Test negative skip (should return 422 Unprocessable Entity due to FastAPI Query(ge=0))
    response = client.get("/api/v1/jobs?skip=-1&limit=10")
    assert response.status_code == 422

    # Test limit 0 (should return 422 because limit gt=0)
    response = client.get("/api/v1/jobs?skip=0&limit=0")
    assert response.status_code == 422

    # Test limit too high (should return 422 because limit le=100)
    response = client.get("/api/v1/jobs?skip=0&limit=101")
    assert response.status_code == 422

def test_upload_zero_byte_file():
    # Create an empty file
    with tempfile.NamedTemporaryFile(suffix=".xtf", delete=False) as f:
        temp_path = f.name
        
    try:
        with open(temp_path, "rb") as f:
            response = client.post(
                "/api/v1/sonar/upload",
                files={"file": ("empty.xtf", f, "application/octet-stream")}
            )
        assert response.status_code == 400
        assert "0 bytes" in response.json()["error"]["message"]
    finally:
        os.remove(temp_path)

def test_upload_corrupted_file():
    # Create a corrupted file with some garbage bytes but not empty
    with tempfile.NamedTemporaryFile(suffix=".xtf", delete=False) as f:
        f.write(b"NOT A REAL XTF OR JSF FILE GARBAGE DATA")
        temp_path = f.name
        
    try:
        with open(temp_path, "rb") as f:
            response = client.post(
                "/api/v1/sonar/upload",
                files={"file": ("corrupted.xtf", f, "application/octet-stream")}
            )
        # Should return 400, not 500
        assert response.status_code == 400
        assert "Failed to parse file" in response.json()["error"]["message"]
    finally:
        os.remove(temp_path)


