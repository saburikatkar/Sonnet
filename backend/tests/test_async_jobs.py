import pytest
import io
import asyncio
from fastapi.testclient import TestClient
from backend.main import app
from backend.mock_engine import MockYoloEngine, TAXONOMY
from backend.job_manager import AsyncJobManager

client = TestClient(app)

def test_detect_endpoint_creates_job():
    file_bytes = b"fake-png-content"
    response = client.post(
        "/api/v1/detect",
        files={"file": ("sonar_scan.png", io.BytesIO(file_bytes), "image/png")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert data["job_id"].startswith("job_")
    assert data["status"] == "processing_async"
    assert data["detections"] == []

def test_detect_endpoint_rejects_unsupported_format():
    file_bytes = b"fake-pdf-content"
    response = client.post(
        "/api/v1/detect",
        files={"file": ("report.pdf", io.BytesIO(file_bytes), "application/pdf")}
    )
    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INVALID_FILE"

def test_detect_endpoint_rejects_empty_file():
    file_bytes = b""
    response = client.post(
        "/api/v1/detect",
        files={"file": ("empty.png", io.BytesIO(file_bytes), "image/png")}
    )
    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "EMPTY_FILE"

def test_get_job_status_not_found():
    response = client.get("/api/v1/jobs/job_nonexistent_99999")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "JOB_NOT_FOUND"

def test_get_job_status_lifecycle():
    # 1. Create job
    file_bytes = b"sonar-log-data"
    post_res = client.post(
        "/api/v1/detect",
        files={"file": ("survey_01.xtf", io.BytesIO(file_bytes), "application/octet-stream")}
    )
    assert post_res.status_code == 200
    job_id = post_res.json()["job_id"]

    # 2. Immediately poll status
    poll_res = client.get(f"/api/v1/jobs/{job_id}")
    assert poll_res.status_code == 200
    job_data = poll_res.json()
    assert job_data["job_id"] == job_id
    assert job_data["status"] in ["processing", "completed"]

def test_job_websocket_status_streaming():
    file_bytes = b"sonar-log-data"
    post_res = client.post(
        "/api/v1/detect",
        files={"file": ("survey_ws.png", io.BytesIO(file_bytes), "image/png")}
    )
    assert post_res.status_code == 200
    job_id = post_res.json()["job_id"]

    with client.websocket_connect(f"/api/v1/jobs/{job_id}/ws") as websocket:
        data = websocket.receive_json()
        assert data["job_id"] == job_id
        assert data["status"] in ["processing", "completed"]

def test_job_websocket_root_alias():
    file_bytes = b"sonar-log-data"
    post_res = client.post(
        "/api/v1/detect",
        files={"file": ("survey_ws_root.png", io.BytesIO(file_bytes), "image/png")}
    )
    assert post_res.status_code == 200
    job_id = post_res.json()["job_id"]

    with client.websocket_connect(f"/jobs/{job_id}/ws") as websocket:
        data = websocket.receive_json()
        assert data["job_id"] == job_id
        assert data["status"] in ["processing", "completed"]

@pytest.mark.anyio
async def test_mock_engine_detection_constraints():
    engine = MockYoloEngine(min_delay=0.0, max_delay=0.01)
    detections = await engine.infer("sample.png")

    assert len(detections) >= 1
    for det in detections:
        assert det["detection_id"].startswith("det_")
        assert det["class_name"] in TAXONOMY
        assert 0.0 <= det["confidence"] <= 1.0

        bbox = det["bbox"]
        assert 0.0 <= bbox["x_min"] < bbox["x_max"] <= 1.0
        assert 0.0 <= bbox["y_min"] < bbox["y_max"] <= 1.0

        geotag = det["geotag"]
        assert isinstance(geotag["latitude"], float)
        assert isinstance(geotag["longitude"], float)
        assert isinstance(geotag["depth_meters"], float)

@pytest.mark.anyio
async def test_job_manager_crud():
    mgr = AsyncJobManager()
    jid = await mgr.create_job()
    assert jid.startswith("job_")

    job = await mgr.get_job(jid)
    assert job is not None
    assert job.status == "pending"

    await mgr.update_job_status(jid, status="processing")
    job = await mgr.get_job(jid)
    assert job.status == "processing"

    sample_detections = [{
        "detection_id": "det_001",
        "class_name": "plastic",
        "confidence": 0.95,
        "bbox": {"x_min": 0.1, "y_min": 0.2, "x_max": 0.3, "y_max": 0.4},
        "geotag": {"latitude": 45.1, "longitude": -12.4, "depth_meters": 15.0}
    }]
    await mgr.update_job_status(jid, status="completed", detections=sample_detections)
    job = await mgr.get_job(jid)
    assert job.status == "completed"
    assert len(job.detections) == 1