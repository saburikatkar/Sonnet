const { spawn } = require('node:child_process')
const http = require('node:http')
const path = require('node:path')

let backendProcess = null

function checkBackend(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8000/health', { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

async function startBackend() {
  const isAlreadyRunning = await checkBackend(1000)
  if (isAlreadyRunning) {
    console.log('[Backend] Already active and healthy on http://127.0.0.1:8000')
    return true
  }

  const rootDir = path.resolve(__dirname, '../..')
  console.log(`[Backend] Starting FastAPI Uvicorn backend from: ${rootDir}`)

  const pythonCmd = process.env.PYTHON_PATH || 'python'
  const args = ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', '8000']

  try {
    backendProcess = spawn(pythonCmd, args, {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      shell: process.platform === 'win32',
    })

    backendProcess.stdout?.on('data', (data) => {
      const line = data.toString().trim()
      if (line) console.log(`[Uvicorn] ${line}`)
    })

    backendProcess.stderr?.on('data', (data) => {
      const line = data.toString().trim()
      if (line) console.log(`[Uvicorn] ${line}`)
    })

    backendProcess.on('error', (err) => {
      console.error('[Backend] Failed to spawn process:', err.message)
      backendProcess = null
    })

    backendProcess.on('exit', (code, signal) => {
      console.log(`[Backend] Process terminated (code: ${code}, signal: ${signal})`)
      backendProcess = null
    })

    // Wait until server is healthy (up to 15 seconds)
    const startTime = Date.now()
    while (Date.now() - startTime < 15000) {
      await new Promise((r) => setTimeout(r, 600))
      const isUp = await checkBackend(1000)
      if (isUp) {
        console.log('[Backend] Successfully started and verified online at http://127.0.0.1:8000/health')
        return true
      }
    }

    console.warn('[Backend] Timeout waiting for backend to respond to /health')
    return false
  } catch (err) {
    console.error('[Backend] Error spawning backend:', err)
    return false
  }
}

function stopBackend() {
  if (backendProcess) {
    console.log('[Backend] Terminating backend process...')
    const pid = backendProcess.pid
    backendProcess = null

    if (process.platform === 'win32') {
      try {
        spawn('taskkill', ['/pid', String(pid), '/f', '/t'], { stdio: 'ignore' })
      } catch {
        // ignore
      }
    } else {
      try {
        process.kill(pid, 'SIGTERM')
      } catch {
        // ignore
      }
    }
  }
}

module.exports = {
  checkBackend,
  startBackend,
  stopBackend,
}
