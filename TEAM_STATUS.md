# Team Task Board

| Member | Task | Status | Branch | Dependencies | Tests/Evidence | Next Action |
|--------|------|--------|--------|--------------|----------------|-------------|
| M1 | Dataset and model evaluation | READY | - | None | None | Identify datasets, check labels, propose split strategy |
| M2 | Image preprocessing and tiling | READY | - | None | None | Build standalone tiling utility with synthetic data |
| B1 | Sonar parsing and geotagging research | DONE | backend/b1/sonar-file-reading | None | `test_geotagging.py`, `test_read_log.py` | Await integration with backend API |
| B2 | Backend API Contracts | DONE | backend/b2/api-contract-and-routes | None | `api-contract.md` | Await YOLO model for inference |
| U1 | Desktop UI foundation | DONE | ui/u1/electron-shell | None | `ui/package.json` | Await UI components from U2 |
| U2 | UI integration preparation | READY | ui/u2/integration-checklist | U1 Shell | `ui-integration-checklist.md` | Bind React states to backend endpoints |

*Note: Work is not considered DONE without verifiable evidence and review.*
