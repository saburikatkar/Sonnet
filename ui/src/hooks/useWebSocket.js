import { useEffect, useRef, useCallback } from 'react'
import { getWebSocketUrl } from '../api/client'

/**
 * useWebSocket — extracted WS hook preserving existing telemetry.
 * Connects to the job WebSocket for streaming detection status.
 * Also handles navigation telemetry channel if available.
 *
 * @param {string|null} jobId
 * @param {object} handlers
 * @param {function} handlers.onMessage  — called with parsed JSON message
 * @param {function} handlers.onNav      — called with navigation telemetry object
 * @param {function} handlers.onStage    — called with stage string
 * @param {function} handlers.onError    — called on socket error
 */
export function useWebSocket(jobId, { onMessage, onNav, onStage, onError } = {}) {
  const wsRef = useRef(null)

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!jobId) return
    disconnect()

    const url = getWebSocketUrl(jobId)
    let ws
    try {
      ws = new WebSocket(url)
    } catch (e) {
      onError?.(e)
      return
    }
    wsRef.current = ws

    ws.onopen = () => {
      console.info(`[WS] Connected: ${url}`)
    }

    ws.onmessage = (event) => {
      let data
      try { data = JSON.parse(event.data) } catch { return }

      onMessage?.(data)

      // Navigation telemetry channel
      // TODO: confirm nav message schema with backend
      if (data.type === 'nav' || data.channel === 'navigation') {
        onNav?.(data.payload ?? data)
      }
      // Stage/status updates
      if (data.stage) onStage?.(data.stage)
    }

    ws.onerror = (event) => {
      console.warn('[WS] Error', event)
      onError?.(event)
    }

    ws.onclose = () => {
      console.info('[WS] Closed')
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [jobId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { disconnect }
}
