# Team Synora - Desktop Application Shell (SIH26057)

AI-Powered Automated Underwater Marine Debris and Anomaly Detection using Side-Scan Sonar Imagery.

Minimal Electron + React + Vite desktop application shell. Window titled **Team Synora** displaying the team header, project description, and secure runtime bridge details.

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
|   |-- App.css
|   |-- App.jsx        # Starter screen component
|   \-- main.jsx       # React mount entry
\-- dist/              # Production build output (git-ignored)
```

> **Note on Entry Point:** The Electron entry point is `electron/main.cjs` as declared in `package.json` (`"main": "electron/main.cjs"`). `ui/main.js` is not used.

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
Runs Vite dev server on port 5173, waits for the port to become ready, and launches Electron:
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

## Verification Steps

1. **Window Title**: The application window title bar reads **Team Synora**.
2. **Starter Screen Content**: The UI displays:
   - Header: **Team Synora**
   - Project Subheading: **SIH26057 Desktop Application Shell**
   - Full Description: **AI-Powered Automated Underwater Marine Debris and Anomaly Detection using Side-Scan Sonar Imagery**
   - Status badge: `Shell Active`
3. **Preload Bridge**: Displays live runtime versions: `Electron <version> | Chromium <version> | Node <version>`.
4. **DevTools Security Check**: Press `Ctrl+Shift+I`:
   - No CSP violations or console errors.
   - `window.synora.versions` returns the versions object.
   - Node globals (`require`, `process`) are undefined in the renderer context (`nodeIntegration: false`).

---

## Troubleshooting

| Symptom | Cause & Solution |
| :--- | :--- |
| **Blank page at `127.0.0.1:5500` (VS Code Live Server)** | **Vite is not running.** Live Server serves static files directly. Browsers cannot parse untranspiled JSX or resolve bare module imports (`react`) without Vite's dev server. Do not use Live Server; run `npm run dev` instead. |
| **Port 5173 already in use** | Another Vite process is running. Stop the existing process or terminate the process listening on port 5173 before launching `npm run dev`. |
| **Blank window after build (`npm start`)** | Asset paths not relative. Ensure `base: './'` is configured in `vite.config.js` so that `dist/index.html` can load assets over the `file://` protocol. |
| **Electron not found / install failed** | The Electron binary download was interrupted or blocked. Delete the `node_modules` directory and reinstall via `npm install`. |
| **Node version mismatch** | Vite 8 and Electron require modern Node.js versions. Upgrade to Node.js 20.19+, 22.12+, or 24+. |

---

## Security Configuration

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- Restrictive Content-Security-Policy in `index.html`
- Dedicated preload bridge exposing only read-only version strings (`synora.versions`)
