# Team Task Board (Phase 4 - Production Persistence & Real-Time Sync)

| Member | Task | Status | Branch | Dependencies | Tests/Evidence | Next Action |
|--------|------|--------|--------|--------------|----------------|-------------|
| U2 | Frontend WebSocket Integration | READY | ui/u2/websocket-integration | B2 WebSocket Endpoint | None | Replace HTTP polling in `client.js` with native WebSocket streaming |
| B2 | SQLite Database Persistence | READY | backend/b2/database-persistence | None | None | Define SQLAlchemy models and persist async jobs in `synora.db` |
| B1 | Historical Jobs API | READY | backend/b1/job-history-api | B2 Database | None | Implement `GET /api/v1/jobs` with pagination and status filters |
| U1 | Historical Dashboard UI | READY | ui/u1/historical-dashboard | None | None | Build `HistoryPanel.jsx` component and wire up historical job reload |
| M1 | Dataset and model evaluation | PAUSED | - | None | - | Temporarily on hold for Phase 4 engineering focus |
| M2 | Image preprocessing and tiling | PAUSED | - | None | - | Temporarily on hold for Phase 4 engineering focus |

*Note: Work is not considered DONE without verifiable evidence and review.*