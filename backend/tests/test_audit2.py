import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_jobs_invalid_status_filter():
    response = client.get("/api/v1/jobs?status=DROP TABLE jobs;")
    assert response.status_code == 422
    assert "Invalid status filter" in response.json()["error"]["message"]

def test_report_generation_empty_detections():
    response = client.post("/api/v1/reports/generate", json={"format": "csv", "detections": []})
    assert response.status_code == 400
    assert "No detections provided" in response.json()["error"]["message"]

def test_report_generation_invalid_format():
    response = client.post("/api/v1/reports/generate", json={"format": "pdf", "detections": [{"detection_id": "test", "class_name": "wreck", "confidence": 0.9, "bbox": {"x_min": 0, "y_min": 0, "x_max": 1, "y_max": 1}}]})
    assert response.status_code == 422
