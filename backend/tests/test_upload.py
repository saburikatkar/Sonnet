import io
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_upload_empty_file():
    file_bytes = b""
    response = client.post(
        "/api/v1/sonar/upload",
        files={"file": ("empty.xtf", io.BytesIO(file_bytes), "application/octet-stream")}
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "EMPTY_FILE"

def test_render_image_empty_file():
    file_bytes = b""
    response = client.post(
        "/api/v1/sonar/render-image",
        files={"file": ("empty.xtf", io.BytesIO(file_bytes), "application/octet-stream")}
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "EMPTY_FILE"

def test_upload_corrupted_file():
    file_bytes = b"corrupted data that is not empty but also not valid xtf"
    response = client.post(
        "/api/v1/sonar/upload",
        files={"file": ("corrupted.xtf", io.BytesIO(file_bytes), "application/octet-stream")}
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "CORRUPTED_FILE"

def test_render_image_corrupted_file():
    file_bytes = b"corrupted data that is not empty but also not valid xtf"
    response = client.post(
        "/api/v1/sonar/render-image",
        files={"file": ("corrupted.xtf", io.BytesIO(file_bytes), "application/octet-stream")}
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "CORRUPTED_FILE"
