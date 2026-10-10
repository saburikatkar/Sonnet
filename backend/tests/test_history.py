import pytest
import pytest_asyncio
import asyncio
from fastapi.testclient import TestClient
from backend.main import app
from backend.job_manager import job_manager

client = TestClient(app)

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    await job_manager.clear_all()
    yield
    await job_manager.clear_all()

@pytest.mark.asyncio
async def test_historical_jobs_api():
    # Create a couple of mock jobs
    job1_id = await job_manager.create_job()
    await job_manager.update_job_status(job1_id, "completed", detections=[{}, {}]) # 2 detections
    
    job2_id = await job_manager.create_job()
    await job_manager.update_job_status(job2_id, "failed")
    
    # Let the DB commit correctly
    await asyncio.sleep(0.1)
    
    # Test getting all jobs
    response = client.get("/api/v1/jobs")
    assert response.status_code == 200
    data = response.json()
    
    assert "items" in data
    assert len(data["items"]) == 2
    
    # Verify the contents (should be ordered by created_at desc)
    # The first one returned will be job2 (since it was created second)
    assert data["items"][0]["job_id"] == job2_id
    assert data["items"][0]["status"] == "failed"
    assert data["items"][0]["detection_count"] == 0
    
    assert data["items"][1]["job_id"] == job1_id
    assert data["items"][1]["status"] == "completed"
    assert data["items"][1]["detection_count"] == 2
    
    # Test pagination
    response_paginated = client.get("/api/v1/jobs?limit=1")
    data_paginated = response_paginated.json()
    assert len(data_paginated["items"]) == 1
    
    # Test status filter
    response_filtered = client.get("/api/v1/jobs?status=completed")
    data_filtered = response_filtered.json()
    assert len(data_filtered["items"]) == 1
    assert data_filtered["items"][0]["job_id"] == job1_id
