# Team Task Board

| Member | Task | Status | Branch | Dependencies | Tests/Evidence | Next Action |
|--------|------|--------|--------|--------------|----------------|-------------|
| M1 | Dataset and model evaluation | READY | - | None | None | Identify datasets, check labels, propose split strategy |
| M2 | Image preprocessing and tiling | READY | - | None | None | Build standalone tiling utility with synthetic data |
| B1 | Sonar parsing and geotagging research | DONE | backend/b1/sonar-file-reading | None | `test_geotagging.py`, `test_read_log.py` | Await integration with backend API |
| B2 | Backend Phase 0 (health endpoint) | DONE | backend/b2/health-endpoint | None | `test_main.py` | Propose API schema for detection results |
| U1 | Desktop UI foundation | READY | - | None | None | Setup Electron + React + Vite shell and document launch |
| U2 | UI integration preparation | WAITING | - | B2 API, U1 Shell | None | Draft integration checklist and propose states |

*Note: Work is not considered DONE without verifiable evidence and review.*
