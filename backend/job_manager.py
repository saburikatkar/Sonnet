import uuid
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from dataclasses import dataclass, field

@dataclass
class JobRecord:
    job_id: str
    status: str  # "pending", "processing", "completed", "failed"
    created_at: datetime
    updated_at: datetime
    detections: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[Dict[str, Any]] = None

class AsyncJobManager:
    """Thread-safe in-memory store for tracking async detection jobs."""

    def __init__(self):
        self._jobs: Dict[str, JobRecord] = {}
        self._lock = asyncio.Lock()

    async def create_job(self) -> str:
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        record = JobRecord(
            job_id=job_id,
            status="pending",
            created_at=now,
            updated_at=now,
            detections=[]
        )
        async with self._lock:
            self._jobs[job_id] = record
        return job_id

    async def get_job(self, job_id: str) -> Optional[JobRecord]:
        async with self._lock:
            return self._jobs.get(job_id)

    async def update_job_status(
        self,
        job_id: str,
        status: str,
        detections: Optional[List[Dict[str, Any]]] = None,
        error: Optional[Dict[str, Any]] = None
    ) -> bool:
        async with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return False
            job.status = status
            job.updated_at = datetime.now(timezone.utc)
            if detections is not None:
                job.detections = detections
            if error is not None:
                job.error = error
            return True

    async def clear_all(self):
        async with self._lock:
            self._jobs.clear()

job_manager = AsyncJobManager()