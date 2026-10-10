/**
 * Team Synora - Backend API Client
 * Interfaces with FastAPI endpoints conforming to docs/api-contract.md
 */

export const API_BASE_URL = 'http://127.0.0.1:8000'

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
 * 2. Detection Endpoint: POST /api/v1/detect
 * Dispatches multipart/form-data upload with 'file'.
 * If async polling is needed, polls until completion or returns detections if present.
 * @param {File} file
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @param {(stage: string) => void} [options.onStageChange]
 * @returns {Promise<{job_id: string, status: string, detections: Array}>}
 */
export async function detectFile(file, { signal, onStageChange } = {}) {
  const formData = new FormData()
  formData.append('file', file)

  onStageChange?.('Uploading payload to inference server...')

  const response = await fetch(`${API_BASE_URL}/api/v1/detect`, {
    method: 'POST',
    body: formData,
    signal,
  })

  if (!response.ok) {
    throw await parseError(response)
  }

  const result = await response.json()

  // If backend returns detections directly
  if (result.detections && Array.isArray(result.detections) && result.detections.length > 0) {
    return result
  }

  // If status is processing_async, poll job status
  if (result.status === 'processing_async' && result.job_id) {
    onStageChange?.('Processing anomaly scan & extracting coordinates...')
    return await pollJobStatus(result.job_id, { signal, onStageChange, fallbackResult: result })
  }

  return result
}

/**
 * Poll job status endpoint
 */
async function pollJobStatus(jobId, { signal, onStageChange, fallbackResult, maxRetries = 10 } = {}) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Operation aborted by user', 'AbortError')
    }

    try {
      const pollRes = await fetch(`${API_BASE_URL}/api/v1/detect/jobs/${jobId}`, { signal })
      if (pollRes.ok) {
        const jobData = await pollRes.json()
        if (jobData.status === 'completed' || (jobData.detections && jobData.detections.length > 0)) {
          return jobData
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e
    }

    onStageChange?.(`Processing anomaly scan (step ${attempt}/${maxRetries})...`)
    await new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException('Operation aborted by user', 'AbortError'))
      
      const timeoutId = setTimeout(resolve, 1000)
      
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeoutId)
          reject(new DOMException('Operation aborted by user', 'AbortError'))
        }, { once: true })
      }
    })
  }

  return fallbackResult
}

/**
 * 3. Sonar Log Upload: POST /api/v1/sonar/upload
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
 * 4. Geotagging Endpoint: POST /api/v1/geotag
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
