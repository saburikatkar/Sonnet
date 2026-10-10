import React from 'react'
import './TopBar.css'

const TABS = ['LIVE', 'PLAYBACK', 'PROCESSING', 'ANALYSIS', 'EXPORT', 'REPORT', 'ADMIN']

function formatTime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export default function TopBar({
  activeTab,
  onTabChange,
  isConnected,
  isRecording,
  recordingTime,
  onToggleRecording,
  onOpenSettings,
}) {
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
      </div>

      {/* Nav tabs */}
      <nav className="topbar__tabs" role="tablist" aria-label="Main navigation">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            type="button"
            aria-selected={activeTab === tab}
            className={`topbar__tab ${activeTab === tab ? 'topbar__tab--active' : ''}`}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Right side status pills */}
      <div className="topbar__right">
        {/* ROV Status */}
        <div className={`topbar__pill topbar__pill--${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="topbar__pill-dot" />
          {isConnected ? 'ROV CONNECTED' : 'ROV OFFLINE'}
        </div>

        {/* Recording / Paused status */}
        <button
          type="button"
          className={`topbar__pill topbar__pill--timer ${isRecording ? 'topbar__pill--recording' : 'topbar__pill--paused'}`}
          onClick={onToggleRecording}
          title={isRecording ? 'Click to Pause' : 'Click to Record'}
        >
          <span className="topbar__timer-dot" />
          <span>{isRecording ? 'REC' : 'PAUSED'}</span>
          <span className="topbar__timer-time">{formatTime(recordingTime)}</span>
        </button>

        {/* Settings gear */}
        <button
          type="button"
          className="topbar__icon-btn"
          title="System Settings"
          aria-label="Settings"
          onClick={onOpenSettings}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  )
}
