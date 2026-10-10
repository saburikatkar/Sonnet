/**
 * Team Synora - Backend API Client
 * Interfaces with FastAPI endpoints conforming to docs/api-contract.md
 */

export const API_BASE_URL = 'http://127.0.0.1:8000'

/**
 * Derives the WebSocket URL for streaming job status updates
 * @param {string} jobId
 * @returns {string}
 */
export function getJobWebSocketUrl(jobId) {
  const wsBase = API_BASE_URL.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:')
  return `${wsBase}/api/v1/jobs/${jobId}/ws`
}

/**
 * Standard error shape parser
 * @param {Response} response
 * @returns {Promise<Error>}
 */
async function parseError(response) {
  let errorData
  try {
    errorData = await response.json()
  } catch {
    errorData = null
  }

  const code = errorData?.error?.code || `HTTP_${response.status}`
  const message = errorData?.error?.message || response.statusText || 'An unexpected error occurred'
  const details = errorData?.error?.details || {}

  const err = new Error(message)
  err.code = code
  err.status = response.status
  err.details = details
  return err
}

/**
 * 1. Health Endpoint: GET /health
 * @param {AbortSignal} [signal]
 * @returns {Promise<{status: string}>}
 */
export async function checkHealth(signal) {
  const response = await fetch(`${API_BASE_URL}/health`, { signal })
  if (!response.ok) {
    throw await parseError(response)
  }
  return response.json()
}

/**
 * 2. Start Detection Endpoint: POST /api/v1/detect
 * Dispatches multipart/form-data upload with 'file'.
 * Returns job_id and status: "processing_async".
 * @param {File} file
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{job_id: string, status: string, detections: Array}>}
 */
export async function initiateDetection(file, { signal } = {}) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/api/v1/detect`, {
    method: 'POST',
    body: formData,
    signal,
  })

  if (!response.ok) {
    throw await parseError(response)
  }

  return response.json()
}

/**
 * 3. REST Fallback Job Status Endpoint: GET /api/v1/jobs/{job_id}
 * @param {string} jobId
 * @param {AbortSignal} [signal]
 * @returns {Promise<{job_id: string, status: string, detections: Array, error?: any}>}
 */
export async function getJobStatus(jobId, signal) {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`, { signal })
  if (!response.ok) {
    throw await parseError(response)
  }
  return response.json()
}

/**
 * Real-time detection with native WebSocket streaming
 * Completely replaces HTTP polling with zero-latency WebSocket push updates.
 * @param {File} file
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @param {(stage: string, data?: any) => void} [options.onStageChange]
 * @param {(jobId: string) => void} [options.onJobRegistered]
 * @param {number} [options.timeoutMs]
 * @returns {Promise<{job_id: string, status: string, detections: Array}>}
 */
export async function detectFileAsync(
  file,
  {
    signal,
    onStageChange,
    onJobRegistered,
    timeoutMs = 60000,
  } = {}
) {
  onStageChange?.('Uploading sonar payload and registering async job...')

  const initResult = await initiateDetection(file, { signal })
  const jobId = initResult.job_id

  if (!jobId) {
    // If backend returns immediate detections
    return initResult
  }

  onJobRegistered?.(jobId)
  onStageChange?.(`Job registered (${jobId}). Connecting real-time WebSocket stream...`, { jobId })

  return new Promise((resolve, reject) => {
    const wsBase = API_BASE_URL.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:')
    const primaryWsUrl = `${wsBase}/api/v1/jobs/${jobId}/ws`
    const fallbackWsUrl = `${wsBase}/jobs/${jobId}/ws`

    let ws = null
    let timer = null
    let isSettled = false
    let triedFallback = false

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (ws) {
        try {
          ws.onopen = null
          ws.onmessage = null
          ws.onerror = null
          ws.onclose = null
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close()
          }
        } catch {
          // ignore cleanup errors
        }
        ws = null
      }
      if (signal && handleAbort) {
        signal.removeEventListener('abort', handleAbort)
      }
    }

    const finish = (fn, val) => {
      if (!isSettled) {
        isSettled = true
        cleanup()
        fn(val)
      }
    }

    const handleAbort = () => {
      finish(reject, new DOMException('Operation aborted by user', 'AbortError'))
    }

    if (signal) {
      if (signal.aborted) {
        return handleAbort()
      }
      signal.addEventListener('abort', handleAbort, { once: true })
    }

    // Set overall job timeout
    timer = setTimeout(() => {
      finish(reject, new Error(`Detection job timed out after ${timeoutMs / 1000} seconds.`))
    }, timeoutMs)

    function connect(url) {
      try {
        ws = new WebSocket(url)
      } catch (err) {
        finish(reject, new Error(`Failed to initialize WebSocket connection: ${err.message}`))
        return
      }

      ws.onopen = () => {
        onStageChange?.(`WebSocket connected for job ${jobId}. Streaming inference telemetry...`, { jobId })
      }

      ws.onmessage = (event) => {
        try {
          const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
          const { status, error } = payload

          if (status === 'processing' || status === 'processing_async') {
            onStageChange?.(`Inference active on server (${status})...`, { jobId, payload })
          } else if (status === 'completed') {
            onStageChange?.('Inference completed successfully. Rendering detections...', { jobId, payload })
            finish(resolve, payload)
          } else if (status === 'failed') {
            const errMsg = error?.message || 'Detection job failed on backend.'
            const err = new Error(errMsg)
            err.code = error?.code || 'JOB_FAILED'
            err.details = error?.details || {}
            finish(reject, err)
          } else {
            onStageChange?.(`Status update: ${status}`, { jobId, payload })
          }
        } catch (parseErr) {
          console.error('Failed to parse WebSocket JSON payload:', parseErr, event.data)
        }
      }

      ws.onerror = (event) => {
        // If initial connection to primary endpoint fails to establish, attempt fallback endpoint
        if (!triedFallback && ws && ws.readyState !== WebSocket.OPEN) {
          triedFallback = true
          try {
            ws.close()
          } catch {
            // ignore
          }
          connect(fallbackWsUrl)
        }
      }

      ws.onclose = (event) => {
        if (!isSettled) {
          if (!triedFallback && event.code !== 1000 && event.code !== 4004) {
            triedFallback = true
            connect(fallbackWsUrl)
            return
          }
          if (event.code === 4004) {
            const err = new Error(`Job not found on backend (${jobId})`)
            err.code = 'JOB_NOT_FOUND'
            finish(reject, err)
          } else if (event.code !== 1000) {
            finish(reject, new Error(`WebSocket closed unexpectedly (code ${event.code}): ${event.reason || 'Connection lost'}`))
          }
        }
      }
    }

    connect(primaryWsUrl)
  })
}

/**
 * 4. Report Generation Endpoint: POST /api/v1/reports/generate (B1)
 * @param {'csv' | 'geojson'} format
 * @param {Array} detections
 * @param {AbortSignal} [signal]
 * @returns {Promise<Blob>}
 */
export async function generateReportApi(format, detections, signal) {
  const response = await fetch(`${API_BASE_URL}/api/v1/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: format,
      detections: detections,
    }),
    signal,
  })

  if (!response.ok) {
    throw await parseError(response)
  }

  return response.blob()
}

/**
 * 5. Sonar Log Upload: POST /api/v1/sonar/upload
 * @param {File} file
 * @param {AbortSignal} [signal]
 */
export async function uploadSonarLog(file, signal) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/api/v1/sonar/upload`, {
    method: 'POST',
    body: formData,
    signal,
  })

  if (!response.ok) {
    throw await parseError(response)
  }
  return response.json()
}

/**
 * 6. Geotagging Endpoint: POST /api/v1/geotag
 * @param {Object} detection
 * @param {Array} pingMetadata
 * @param {AbortSignal} [signal]
 */
export async function geotagDetection(detection, pingMetadata, signal) {
  const response = await fetch(`${API_BASE_URL}/api/v1/geotag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ detection, ping_metadata: pingMetadata }),
    signal,
  })

  if (!response.ok) {
    throw await parseError(response)
  }
  return response.json()
}