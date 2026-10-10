const { spawn } = require('node:child_process')
const http = require('node:http')
const net = require('node:net')
const path = require('node:path')

let backendProcess = null

/**
 * Checks if a TCP port is currently bound by any process
 */
function isPortBound(port = 8000, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(600)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => {
      resolve(false)
    })
    socket.connect(port, host)
  })
}

/**
 * Probes the /health endpoint of the FastAPI backend
 */
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

/**
 * Kills any stale/orphan process bound to port 8000 on Windows
 */
function killPortProcess(port = 8000) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve()

    const netstat = spawn('cmd.exe', ['/c', `netstat -ano | findstr :${port}`], { stdio: ['ignore', 'pipe', 'ignore'] })
    let output = ''
    netstat.stdout?.on('data', (d) => { output += d.toString() })
    netstat.on('close', () => {
      const lines = output.trim().split('\n')
      const pidsToKill = new Set()
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/)
          const pid = parts[parts.length - 1]
          if (pid && pid !== '0' && pid !== String(process.pid)) {
            pidsToKill.add(pid)
          }
        }
      }

      for (const pid of pidsToKill) {
        console.log(`[Backend] Clearing unresponsive process on port ${port} (PID: ${pid})`)
        try {
          spawn('taskkill', ['/pid', pid, '/f', '/t'], { stdio: 'ignore' })
        } catch {
          // ignore
        }
      }
      setTimeout(resolve, 600)
    })
    netstat.on('error', () => resolve())
  })
}

/**
 * Starts the Python FastAPI backend, avoiding duplicate instances and port collisions
 */
async function startBackend() {
  // 1. If backend is already running and responding, reuse it immediately
  const isHealthy = await checkBackend(800)
  if (isHealthy) {
    console.log('[Backend] FastAPI server is already healthy on http://127.0.0.1:8000')
    return true
  }

  // 2. If port is bound but not answering, wait up to 4s in case it's still booting
  const portBound = await isPortBound(8000)
  if (portBound) {
    console.log('[Backend] Port 8000 is active, waiting for application startup...')
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 500))
      if (await checkBackend(800)) {
        console.log('[Backend] Existing server became ready at http://127.0.0.1:8000')
        return true
      }
    }

    // Still not responding? Clear stale zombie process
    console.warn('[Backend] Port 8000 is occupied by an unresponsive process. Terminating it...')
    await killPortProcess(8000)
  }

  // 3. Spawn fresh FastAPI backend
  const rootDir = path.resolve(__dirname, '../..')
  console.log(`[Backend] Launching FastAPI Uvicorn backend from: ${rootDir}`)

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

    // Poll until ready (up to 15 seconds)
    const startTime = Date.now()
    while (Date.now() - startTime < 15000) {
      await new Promise((r) => setTimeout(r, 600))
      if (await checkBackend(800)) {
        console.log('[Backend] Successfully started and verified online at http://127.0.0.1:8000/health')
        return true
      }
    }

    console.warn('[Backend] Warning: Timeout waiting for /health response')
    return false
  } catch (err) {
    console.error('[Backend] Error spawning backend process:', err)
    return false
  }
}

/**
 * Shuts down the spawned backend process cleanly
 */
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
