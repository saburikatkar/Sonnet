# Team Task Board (Phase 2 - Async Infrastructure & Mock E2E Integration)

| Member | Task | Status | Branch | Dependencies | Tests/Evidence | Next Action |
|--------|------|--------|--------|--------------|----------------|-------------|
| B2 | Async Job Manager & Mock Engine | READY | backend/b2/async-jobs | None | Pending | Implement in-memory AsyncJobManager, MockYoloEngine, GET /api/v1/jobs/{job_id} |
| B1 | Report Generation Pipeline | READY | backend/b1/report-generation | None | Pending | Implement POST /api/v1/reports/generate (CSV & GeoJSON generation) |
| U2 | Async Polling & E2E Binding | READY | ui/u2/async-polling-e2e | B2 Async API | Pending | Wire async polling loop and hook export buttons |
| U1 | UI Shell Polish & Responsiveness | READY | ui/u1/shell-polish | None | Pending | Enhance Electron window controls, responsive layout, unified toasts/spinner |
| M1 | Dataset and model evaluation | PAUSED | - | None | - | Temporarily paused for Phase 2 infrastructure focus |
| M2 | Image preprocessing and tiling | PAUSED | - | None | - | Temporarily paused for Phase 2 infrastructure focus |

*Note: Work is not considered DONE without verifiable evidence and review.*