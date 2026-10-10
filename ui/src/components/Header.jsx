import React, { useEffect, useState } from 'react'
import { checkHealth } from '../api/client'

export default function Header() {
  const [healthStatus, setHealthStatus] = useState({ status: 'checking', message: 'Checking API...' })
  const versions = window.synora?.versions

  useEffect(() => {
    let isMounted = true

    async function probeBackend() {
      try {
        const res = await checkHealth()
        if (isMounted) {
          if (res.status === 'ok') {
            setHealthStatus({ status: 'online', message: 'FastAPI Backend Online' })
          } else {
            setHealthStatus({ status: 'degraded', message: `Backend Status: ${res.status}` })
          }
        }
      } catch (err) {
        if (isMounted) {
          setHealthStatus({ status: 'offline', message: 'Backend Offline (localhost:8000)' })
        }
      }
    }

    probeBackend()
    const interval = setInterval(probeBackend, 15000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  return (
    <header className="synora-header">
      <div className="synora-header__brand">
        <div className="synora-header__logo">
          <span className="synora-header__logo-icon">🌊</span>
          <div>
            <h1 className="synora-header__title">Team Synora</h1>
            <p className="synora-header__subtitle">
              SIH26057 &bull; AI-Powered Underwater Marine Debris & Anomaly Detection
            </p>
          </div>
        </div>

        <div className="synora-header__meta">
          <div className={`status-pill status-pill--${healthStatus.status}`} title={healthStatus.message}>
            <span className="status-pill__dot" />
            <span className="status-pill__text">{healthStatus.message}</span>
          </div>

          {versions && (
            <span className="versions-badge" title="Electron Runtime Bridge">
              Electron v{versions.electron} &bull; Chromium v{versions.chrome}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
