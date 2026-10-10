# AGENT.md - U1 (Desktop UI), Team Synora, SIH26057

Project: AI-Powered Automated Underwater Marine Debris and Anomaly Detection using Side-Scan Sonar Imagery
Repo: https://github.com/saburikatkar/Sonnet
Role: U1 builds the Electron + React + Vite desktop shell. The Master Coordinator is B2 (backend owner).
Branch: ui/u1/electron-shell
Environment: Windows + PowerShell. Run `$env:GIT_PAGER = ""` first (the `less` pager is not available in this terminal).

## Current state (verify, do not assume)
- Shell built inside ui/: electron/main.cjs (entry point), preload script, src/App.jsx, vite.config.js, index.html, package.json, package-lock.json, README.md, .gitignore.
- Window title is "Team Synora". The dev launch was tested and worked. Re-run `npm run build` and `npm start` to confirm the production path.
- Nothing is committed or pushed. ui/main.js does not exist; the entry point is ui/electron/main.cjs.
- Open question: B2 has not yet confirmed ownership of ui/package.json and ui/package-lock.json.

## Rules
- Work only inside ui/. Never modify backend/, model/, or anything outside ui/.
- Never commit, push, merge, stash, reset, clean, or delete branches without B2's explicit approval, given by the user in this chat.
- Stage files by name only. Never use `git add .` or `git add -A`. Never stage node_modules/, dist/, .env files, or secrets.
- Never push to main. Never force push. Never use destructive Git commands.
- Keep `contextIsolation: true`, `nodeIntegration: false`, and the preload script. Expose no IPC or Node APIs to React.
- Do not implement uploads, maps, detection overlays, AI inference, Python, backend or database integration until B2 approves the API contract (docs/api-contract.md).
- Report verified facts separately from assumptions. Never claim a command worked unless you ran it now, and show the raw output.
- Plan first and wait for the user's approval before editing any file.

## Next steps, in order
1. Read-only check: `git branch --show-current` ; `git status --short -uall` ; `npm run build` ; `npm start`. Report the results.
2. Wait for B2's reply to the REVIEW report.
3. If B2 approves a local commit: stage ui/ files by name, show `git diff --cached --name-only`, wait for the user's OK, then commit with the message `feat(ui): add Electron + React + Vite desktop shell (U1)`. Do not push.
4. If B2 approves a push: `git push -u origin ui/u1/electron-shell`. Then stop. B2 reviews and merges.
5. Only after B2 assigns the next task, start it. Plan first and wait for approval before editing.

## Report format
MEMBER / ROLE / STATUS / BRANCH / FILES CHANGED / WORK COMPLETED / TESTS RUN AND ACTUAL RESULTS / DEPENDENCIES OR BLOCKERS / NEXT PROPOSED ACTION / DECISION NEEDED FROM COORDINATOR