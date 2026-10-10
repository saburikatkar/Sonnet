import { useState, useEffect, useCallback } from 'react'
import { API_BASE_URL } from './config.js'

export default function App() {
  const versions = window.synora?.versions
  const [backendStatus, setBackendStatus] = useState('checking') // 'checking' | 'connected' | 'offline'
  const [backendLatency, setBackendLatency] = useState(null)
  const [lastChecked, setLastChecked] = useState(null)

  const checkBackendHealth = useCallback(async () => {
    setBackendStatus('checking')
    const startTime = performance.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)

    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      })
      clearTimeout(timeoutId)
      const elapsed = Math.round(performance.now() - startTime)

      if (response.ok) {
        const data = await response.json()
        if (data.status === 'ok') {
          setBackendStatus('connected')
          setBackendLatency(elapsed)
          setLastChecked(new Date().toLocaleTimeString())
          return
        }
      }
      setBackendStatus('offline')
      setBackendLatency(null)
      setLastChecked(new Date().toLocaleTimeString())
    } catch {
      clearTimeout(timeoutId)
      setBackendStatus('offline')
      setBackendLatency(null)
      setLastChecked(new Date().toLocaleTimeString())
    }
  }, [])

  useEffect(() => {
    checkBackendHealth()
  }, [checkBackendHealth])

  return (
    <main className="shell">
      <header className="shell__header">
        <div className="shell__brand">
          <span className="shell__logo-icon">🌊</span>
          <h1>Team Synora</h1>
        </div>
        <div className="shell__tag">SIH26057</div>
      </header>

      <section className="shell__body">
        <div className="card">
          <h2>Desktop Application Shell</h2>
          <p className="description">
            AI-Powered Automated Underwater Marine Debris and Anomaly Detection using Side-Scan Sonar Imagery
          </p>

          <div className="status-grid">
            {/* Shell Status */}
            <div className="status-item">
              <span className="status-label">Desktop Shell</span>
              <div className="status-badge status-badge--active">
                <span className="status-dot status-dot--active"></span>
                <span>Active (Electron + Vite)</span>
              </div>
            </div>

            {/* Backend Connectivity Indicator */}
            <div className="status-item">
              <div className="status-label-group">
                <span className="status-label">Backend API</span>
                <code className="status-endpoint">{API_BASE_URL}</code>
              </div>

              <div className="backend-status-row">
                {backendStatus === 'checking' && (
                  <div className="status-badge status-badge--checking">
                    <span className="status-dot status-dot--checking"></span>
                    <span>Checking...</span>
                  </div>
                )}
                {backendStatus === 'connected' && (
                  <div className="status-badge status-badge--connected">
                    <span className="status-dot status-dot--connected"></span>
                    <span>Connected {backendLatency ? `(${backendLatency}ms)` : ''}</span>
                  </div>
                )}
                {backendStatus === 'offline' && (
                  <div className="status-badge status-badge--offline">
                    <span className="status-dot status-dot--offline"></span>
                    <span>Offline (Ready for Mock / B2)</span>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn--refresh"
                  onClick={checkBackendHealth}
                  disabled={backendStatus === 'checking'}
                  title="Ping backend health endpoint"
                >
                  {backendStatus === 'checking' ? '...' : 'Ping'}
                </button>
              </div>

              {lastChecked && (
                <p className="status-hint">
                  {backendStatus === 'connected'
                    ? `Health check verified at ${lastChecked}`
                    : `Last checked at ${lastChecked}. Ensure FastAPI backend is running on ${API_BASE_URL}`}
                </p>
              )}
            </div>
          </div>

          <div className="versions-info">
            <span className="versions-label">Runtime Bridge:</span>
            <p className="versions-text">
              {versions
                ? `Electron ${versions.electron} · Chromium ${versions.chrome} · Node ${versions.node}`
                : 'Running in browser context (preload bridge not detected).'}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
