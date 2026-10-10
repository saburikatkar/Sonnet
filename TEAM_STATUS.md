# Team Task Board

| Member | Task | Status | Branch | Dependencies | Tests/Evidence | Next Action |
|--------|------|--------|--------|--------------|----------------|-------------|
| M1 | Dataset and model evaluation | READY | - | None | None | Identify datasets, check labels, propose split strategy |
| M2 | Image preprocessing and tiling | READY | - | None | None | Build standalone tiling utility with synthetic data |
| B1 | Sonar parser & Waterfall Image Gen | DONE | backend/b1/waterfall-image-generation | None | `test_geotagging.py`, `test_read_log.py`, `test_image_generator.py` | Await integration with backend API |
| B2 | Backend API Contracts | DONE | backend/b2/api-contract-and-routes | None | `api-contract.md` | Await YOLO model for inference |
| U1 | Desktop UI foundation | DONE | ui/u1/electron-shell | None | `ui/package.json` | Await YOLO integrations |
| U2 | UI component integration & State bindings | DONE | ui/u2/state-bindings | U1 Shell | `contract.test.js` | Await YOLO model for end-to-end test |

*Note: Work is not considered DONE without verifiable evidence and review.*
