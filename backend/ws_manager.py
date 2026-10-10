import asyncio
from typing import Dict, List
from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        # Maps job_id to a list of connected WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, job_id: str):
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        self.active_connections[job_id].append(websocket)

    def disconnect(self, websocket: WebSocket, job_id: str):
        if job_id in self.active_connections:
            if websocket in self.active_connections[job_id]:
                self.active_connections[job_id].remove(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]

    async def broadcast_job_update(self, job_id: str, payload: dict):
        if job_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[job_id]:
                try:
                    await connection.send_json(payload)
                except Exception:
                    disconnected.append(connection)
            
            for d in disconnected:
                self.disconnect(d, job_id)

ws_manager = WebSocketManager()
