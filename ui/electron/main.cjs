const { app, BrowserWindow } = require('electron')
const path = require('node:path')

const fs = require('node:fs')

const isDev = process.argv.includes('--dev')
const DEV_PORT = process.env.PORT || process.env.VITE_PORT || 5173
const DEV_URL = process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL || `http://127.0.0.1:${DEV_PORT}`
const DIST_INDEX = path.resolve(__dirname, '../dist/index.html')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Team Synora',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Keep the window title fixed even if the page <title> changes.
  win.on('page-title-updated', (e) => e.preventDefault())

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Electron] Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`)
  })

  win.webContents.on('did-finish-load', () => {
    console.log('[Electron] Page loaded successfully in window.')
  })

  if (isDev) {
    win.loadURL(DEV_URL).catch((err) => {
      console.error('[Electron] Error loading DEV_URL:', err.message)
    })
  } else {
    if (!fs.existsSync(DIST_INDEX)) {
      console.error(`[Electron] Production build not found at: ${DIST_INDEX}. Please run 'npm run build' first.`)
    }
    win.loadFile(DIST_INDEX).catch((err) => {
      console.error('[Electron] Error loading dist/index.html:', err.message)
    })
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
