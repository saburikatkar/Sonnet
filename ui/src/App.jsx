export default function App() {
  const versions = window.synora?.versions

  return (
    <main className="shell">
      <header className="shell__header">
        <h1>Team Synora</h1>
      </header>

      <section className="shell__body">
        <div className="card">
          <h2>SIH26057 Desktop Application Shell</h2>
          <p className="description">
            AI-Powered Automated Underwater Marine Debris and Anomaly Detection using Side-Scan Sonar Imagery
          </p>
          <div className="status">
            <span className="badge">Shell Active</span>
            <p className="status-text">
              Desktop shell initialized with Electron, React, and Vite.
            </p>
          </div>
          <div className="versions-info">
            <p className="muted">
              {versions
                ? `Electron ${versions.electron} · Chromium ${versions.chrome} · Node ${versions.node}`
                : 'Running outside Electron (preload bridge not detected).'}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
