# TEAM SYNORA — PHASE 5: PRE-PRODUCTION DEEP CODE AUDIT

**Context:**
All Phase 4 architecture (WebSockets, SQLite Database Persistence, and Historical Dashboards) has been successfully merged into `main`. The application is functionally complete from an engineering standpoint. Before we unpause the Machine Learning (M1) team to ingest the YOLOv11 model, we must ensure our foundational codebase is rock-solid, fully typed, exhaustively tested, and perfectly documented.

**Your Mission:**
You are to execute a rigorous Deep Code Audit and Polish of your respective domain. 
**You MUST use the `/goal` command to begin your task.** This ensures you operate autonomously, meticulously analyze the codebase, and do not stop until the highest standards of production quality are met.

---

## 🛠️ Assignments

### 1. U1 & U2 — Frontend Deep Audit (React + Electron)
**Target:** The `ui/` directory.
**Objectives:**
- **Component Polish:** Ensure all React components (especially the new `HistoryPanel` and `DetectionViewer`) have perfect error boundaries, loading states, and handle empty data gracefully.
- **WebSocket Resiliency:** Review `client.js`. What happens if the WebSocket connection drops unexpectedly? Add automatic reconnection logic or user-facing error toasts.
- **Memory Leaks:** Ensure all `useEffect` hooks cleanly unsubscribe from WebSockets, abort `fetch` signals, and clear intervals.
- **CSS / UI/UX:** Clean up overlapping CSS, ensure responsive flexbox behaviors, and verify the Electron window drag handles work perfectly.
- **Testing:** Add at least 2 new frontend tests to cover the Historical Dashboard edge cases. Run `npm test` to verify.

### 2. B1 & B2 — Backend Deep Audit (FastAPI + SQLAlchemy)
**Target:** The `backend/` directory.
**Objectives:**
- **Database Concurrency:** Review `database.py` and `job_manager.py`. Are we properly closing `AsyncSession` instances? Are there any potential SQLite locking issues or race conditions during rapid WebSocket broadcasts?
- **Data Validation:** Exhaustively review all Pydantic models in `schemas.py`. Are all fields strictly typed? Do we need `Field(..., max_length=100)` constraints to prevent payload injection?
- **Error Handling:** Review `routes.py` and `api_upload.py`. If the sonar file is corrupted, does the server crash, or does it cleanly return a 400 Bad Request with a proper JSON error envelope?
- **Docstrings & Typing:** Ensure *every single function* has a descriptive docstring and precise type hints. Run `mypy backend/` if possible.
- **Testing:** Review the 32 Pytest tests. Add edge-case tests (e.g., uploading a 0-byte file, requesting a non-existent job ID). Run `python -m pytest backend/ -v` to verify.

---

## 🚀 Execution Instructions for Agents:
1. **Acknowledge this prompt** and declare which domain you are auditing.
2. Run `git checkout main` and `git pull origin main`.
3. Check out a new branch: `chore/deep-audit-[your-role]`.
4. Trigger the `/goal` command with a detailed description of your audit plan.
5. Once `/goal` finishes, commit your fixes, push your branch, and create a PR!
