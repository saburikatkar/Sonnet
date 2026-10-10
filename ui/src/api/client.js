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
 * 3. Poll Job Status Endpoint: GET /api/v1/jobs/{job_id}
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
 * High-level detection with managed async polling loop
 * @param {File} file
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @param {(stage: string, data?: any) => void} [options.onStageChange]
 * @param {number} [options.pollIntervalMs]
 * @param {number} [options.maxAttempts]
 */
export async function detectFileAsync(
  file,
  {
    signal,
    onStageChange,
    pollIntervalMs = 1500,
    maxAttempts = 30,
  } = {}
) {
  onStageChange?.('Uploading sonar payload and registering async job...')

  const initResult = await initiateDetection(file, { signal })
  const jobId = initResult.job_id

  if (!jobId) {
    // If backend returns immediate detections
    return initResult
  }

  onStageChange?.(`Job registered (${jobId}). Initializing inference...`, { jobId })

  // Polling loop against GET /api/v1/jobs/{job_id}
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Operation aborted by user', 'AbortError')
    }

    // Wait for poll interval
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))

    onStageChange?.(`Inference running on server... (poll attempt ${attempt}/${maxAttempts})`, { jobId, attempt })

    const statusData = await getJobStatus(jobId, signal)

    if (statusData.status === 'completed') {
      onStageChange?.('Inference completed successfully. Rendering detections...')
      return statusData
    }

    if (statusData.status === 'failed') {
      const errMsg = statusData.error?.message || 'Detection job failed on backend.'
      const err = new Error(errMsg)
      err.code = statusData.error?.code || 'JOB_FAILED'
      err.details = statusData.error?.details || {}
      throw err
    }
  }

  throw new Error(`Detection job timed out after ${maxAttempts} polling attempts.`)
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