# Team Synora - Desktop Application Shell (SIH26057)

AI-Powered Automated Underwater Marine Debris and Anomaly Detection using Side-Scan Sonar Imagery.

Minimal, secure Electron + React + Vite desktop application shell with live backend status monitoring. Window titled **Team Synora** displaying team branding, runtime bridge versions, and configurable backend connectivity.

---

## File Structure

```
ui/
|-- .gitignore
|-- .gitkeep
|-- README.md
|-- index.html
|-- package.json
|-- package-lock.json
|-- vite.config.js
|-- electron/
|   |-- main.cjs       # Electron main process (package.json "main")
|   \-- preload.cjs    # Secure preload bridge (contextIsolation: true)
|-- src/
|   |-- config.js      # Configurable API base URL (VITE_API_BASE_URL)
|   |-- App.css        # Shell styling and status indicator styles
|   |-- App.jsx        # Shell layout & backend status component
|   \-- main.jsx       # React mount entry
\-- dist/              # Production build output (git-ignored)
```

> **Note on Entry Point:** The Electron entry point is `electron/main.cjs` as declared in `package.json` (`"main": "electron/main.cjs"`).

---

## Prerequisites (Windows)

- **Node.js**: v20.19+, v22.12+, or v24.x (Tested: `v24.20.0`)
- **npm**: v10+ (Tested: `11.19.0`)
- **PowerShell** or Command Prompt on Windows

Verify your environment:
```powershell
node -v
npm -v
```

---

## Exact PowerShell Commands

Navigate to the `ui/` directory:
```powershell
cd ui
```

### 1. Installation
Install all dependencies:
```powershell
npm install
```

### 2. Development Mode (with Hot Reload)
Runs Vite dev server on port 5173, waits for the port to become ready, and launches Electron concurrently:
```powershell
npm run dev
```

### 3. Production Build
Compiles React frontend into static assets in `dist/`:
```powershell
npm run build
```

### 4. Production Run
Builds the latest assets and opens the Electron window loading `dist/index.html` locally:
```powershell
npm start
```

---

## Backend Connectivity Configuration

The desktop UI communicates with the backend via `ui/src/config.js`, which reads the environment variable `VITE_API_BASE_URL`:

- **Default Endpoint:** `http://127.0.0.1:8000`
- **Custom Endpoint:** To override, create a `.env` file inside `ui/`:
  ```env
  VITE_API_BASE_URL=http://localhost:8000
  ```
- **Health Check:** The UI periodically polls and pings `${VITE_API_BASE_URL}/health` to provide real-time connection telemetry to the operator.

---

## Security Architecture

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- Content-Security-Policy configured in `index.html`
- Dedicated preload bridge exposing only read-only version strings (`synora.versions`)
- Zero Node.js or IPC primitives exposed to React

---

## Verification Steps

1. **Window Title**: The application window title bar reads **Team Synora**.
2. **Starter Screen Content**:
   - Header: **Team Synora** (Tag: `SIH26057`)
   - Description: **AI-Powered Automated Underwater Marine Debris and Anomaly Detection using Side-Scan Sonar Imagery**
   - Desktop Shell badge: `Active (Electron + Vite)`
   - Backend API badge: `Connected` (when FastAPI is running) or `Offline (Ready for Mock / B2)` with Ping button.
3. **Preload Bridge**: Displays live runtime versions: `Electron <version> · Chromium <version> · Node <version>`.
4. **DevTools Security Check**: Press `Ctrl+Shift+I`:
   - No CSP violations or console errors.
   - `window.synora.versions` returns the versions object.
   - Node globals (`require`, `process`) are undefined in the renderer context (`nodeIntegration: false`).
