import React from 'react'
import './TopBar.css'

export default function TopBar({
  activeTab,
  onTabChange,
  isConnected,
  onOpenUpload,
  onFileSelected,
  onOpenExport,
  onOpenHistory,
}) {
  const fileInputRef = React.useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file && onFileSelected) {
      onFileSelected(file)
    }
    e.target.value = ''
  }

  return (
    <header className="topbar">
      {/* Brand */}
      <div className="topbar__brand">
        <svg className="topbar__logo-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#00c2e0" strokeWidth="1.6" strokeOpacity="0.4" />
          <circle cx="12" cy="12" r="6.5" stroke="#00c2e0" strokeWidth="1.6" strokeOpacity="0.8" />
          <circle cx="12" cy="12" r="2.5" fill="#00c2e0" />
          <path d="M12 2a14 14 0 0 1 3.5 10A14 14 0 0 1 12 22" stroke="#00c2e0" strokeWidth="1.2" strokeOpacity="0.5" />
          <path d="M12 2a14 14 0 0 0-3.5 10A14 14 0 0 0 12 22" stroke="#00c2e0" strokeWidth="1.2" strokeOpacity="0.5" />
        </svg>
        <span className="topbar__brand-name">SONNET</span>
        <span className="topbar__version">v2.4</span>
      </div>

      {/* Nav tabs */}
      <nav className="topbar__tabs" role="tablist" aria-label="Main navigation">
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === 'LIVE'}
          className={`topbar__tab ${activeTab === 'LIVE' ? 'topbar__tab--active' : ''}`}
          onClick={() => onTabChange('LIVE')}
        >
          SIDESCAN WATERFALL
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === 'ANALYSIS'}
          className={`topbar__tab ${activeTab === 'ANALYSIS' ? 'topbar__tab--active' : ''}`}
          onClick={() => onTabChange('ANALYSIS')}
        >
          ANALYTICS
        </button>
        <button
          role="tab"
          type="button"
          className="topbar__tab"
          onClick={onOpenExport}
        >
          EXPORT REPORT
        </button>
        <button
          role="tab"
          type="button"
          className="topbar__tab"
          onClick={onOpenHistory}
        >
          SESSION HISTORY
        </button>
      </nav>

      {/* Right side functional status & action */}
      <div className="topbar__right">
        {/* Backend health pill */}
        <div className={`topbar__pill topbar__pill--${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="topbar__pill-dot" />
          {isConnected ? 'BACKEND ONLINE' : 'BACKEND OFFLINE'}
        </div>

        {/* Model Ready pill */}
        <div className="topbar__pill topbar__pill--model">
          <span className="topbar__model-dot" />
          YOLOv11s ACTIVE
        </div>

        {/* Primary Action Button: Process File */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.tiff,.xtf,.jsf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          type="button"
          className="topbar__upload-btn"
          onClick={() => {
            if (onFileSelected) {
              fileInputRef.current?.click()
            } else {
              onOpenUpload()
            }
          }}
          title="Upload your own side-scan sonar image (.png, .jpg, .tiff) or raw log (.xtf, .jsf) to run YOLO detection"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          UPLOAD &amp; DETECT
        </button>
      </div>
    </header>
  )
}
