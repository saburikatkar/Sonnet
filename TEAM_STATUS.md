# Team Task Board (Phase 4 - Production Persistence & Real-Time Sync)

| Member | Task | Status | Branch | Dependencies | Tests/Evidence | Next Action |
|--------|------|--------|--------|--------------|----------------|-------------|
| U2 | Frontend WebSocket Integration | DONE | ui/u2/websocket-integration | B2 WebSockets | `contract.test.js` (8 passed), Vite build verified | Await backend database persistence |
| B2 | SQLite Database Persistence | READY | backend/b2/database-persistence | None | Pending | Add SQLAlchemy + aiosqlite, define Job/Detection models, async SQLite storage |
| B1 | Historical Jobs API | READY | backend/b1/job-history-api | B2 Database | Pending | Implement GET /api/v1/jobs with pagination and status filters |
| U1 | Historical Dashboard UI | READY | ui/u1/historical-dashboard | None (mockable) | Pending | Build HistoryPanel.jsx data table and view loader |
| M1 | Dataset and model evaluation | PAUSED | - | None | - | Temporarily paused for Phase 4 engineering focus |
| M2 | Image preprocessing and tiling | DONE | model/m2/image-tiling | None | `test_image_tiler.py` (12 passed) | Ready for integration |

*Note: Work is not considered DONE without verifiable evidence and review.*