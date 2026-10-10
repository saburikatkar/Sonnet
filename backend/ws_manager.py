import asyncio
from typing import Dict, List, Any
from fastapi import WebSocket

class WebSocketManager:
    """Manages active WebSocket connections for job status broadcasting."""
    
    def __init__(self) -> None:
        # Maps job_id to a list of connected WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, job_id: str) -> None:
        """Accepts a new WebSocket connection and maps it to a job_id."""
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        self.active_connections[job_id].append(websocket)

    def disconnect(self, websocket: WebSocket, job_id: str) -> None:
        """Removes a WebSocket connection from the job_id mapping."""
        if job_id in self.active_connections:
            if websocket in self.active_connections[job_id]:
                self.active_connections[job_id].remove(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]

    async def broadcast_job_update(self, job_id: str, payload: Dict[str, Any]) -> None:
        """Broadcasts a JSON payload to all WebSockets tracking the given job_id."""
        if job_id in self.active_connections:
            disconnected: List[WebSocket] = []
            for connection in self.active_connections[job_id]:
                try:
                    await connection.send_json(payload)
                except Exception:
                    disconnected.append(connection)
            
            for d in disconnected:
                self.disconnect(d, job_id)

ws_manager = WebSocketManager()
