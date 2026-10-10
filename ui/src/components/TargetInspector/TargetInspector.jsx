import React from 'react'
import { CLASS_META } from '../../constants'
import './TargetInspector.css'

export default function TargetInspector({
  selectedTarget,
  targets = [],
  onUpdateTargetStatus,
  onUpdateTargetClass,
  onOpenExport,
  onOpenUpload,
  onFileSelected,
}) {
  const fileInputRef = React.useRef(null)
  const confirmedCount = targets.filter(
    t => t.status === 'Operator accepted' || t.status === 'Confirmed'
  ).length
  const pendingCount = targets.filter(t => t.status === 'Pending Review').length
  const fpCount = targets.filter(t => t.status === 'False Positive').length

  if (!selectedTarget) {
    return (
      <aside className="target-inspector">
        <div className="ti-header">
          <span className="ti-title">SURVEY OVERVIEW</span>
          <span className="ti-badge">{targets.length} CONTACTS</span>
        </div>

        <div className="ti-body">
          <div className="ti-stats-grid">
            <div className="ti-stat-card">
              <span className="ti-stat-val ti-stat-val--cyan">{targets.length}</span>
              <span className="ti-stat-lbl">Total Detections</span>
            </div>
            <div className="ti-stat-card">
              <span className="ti-stat-val ti-stat-val--green">{confirmedCount}</span>
              <span className="ti-stat-lbl">Confirmed</span>
            </div>
            <div className="ti-stat-card">
              <span className="ti-stat-val ti-stat-val--amber">{pendingCount}</span>
              <span className="ti-stat-lbl">Pending Review</span>
            </div>
            <div className="ti-stat-card">
              <span className="ti-stat-val ti-stat-val--red">{fpCount}</span>
              <span className="ti-stat-lbl">False Positives</span>
            </div>
          </div>

          <div className="ti-quick-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.tiff,.xtf,.jsf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f && onFileSelected) onFileSelected(f)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              className="ti-action-btn ti-action-btn--primary"
              onClick={() => {
                if (onFileSelected) fileInputRef.current?.click()
                else onOpenUpload?.()
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Sonar Image / Scan
            </button>
            <button
              type="button"
              className="ti-action-btn ti-action-btn--secondary"
              onClick={onOpenExport}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Survey Report
            </button>
          </div>

          <div className="ti-instructions">
            <span className="ti-instruction-title">OPERATOR GUIDANCE</span>
            <p>Select any target on the waterfall or from the bottom table to inspect acoustic signatures, verify classifications, and confirm coordinates.</p>
          </div>
        </div>
      </aside>
    )
  }

  const scorePct = Math.round((selectedTarget.confidence ?? selectedTarget.modelScore ?? 0.85) * 100)
  const meta = CLASS_META[selectedTarget.type] || { label: selectedTarget.type || 'Anomaly', color: '#f59e0b' }
  const channel = (selectedTarget.roi || selectedTarget.side || (selectedTarget.bbox?.x < 0.5 ? 'port' : 'starboard')).toUpperCase()

  return (
    <aside className="target-inspector">
      <div className="ti-header">
        <div className="ti-header-left">
          <span className="ti-status-dot" style={{ background: meta.color }} />
          <span className="ti-title">{selectedTarget.id}</span>
        </div>
        <span className={`ti-badge ti-badge--${selectedTarget.status?.replace(/\s+/g, '-').toLowerCase()}`}>
          {selectedTarget.status?.toUpperCase() || 'DETECTED'}
        </span>
      </div>

      <div className="ti-body">
        {/* High-Resolution Acoustic Crop Viewport */}
        <div className="ti-viewport">
          <img
            src={selectedTarget.thumbnailUrl || '/assets/sonar_shipwreck_scan.jpg'}
            alt={selectedTarget.id}
            className="ti-viewport-img"
          />
          <div className="ti-viewport-reticle" />
          <div className="ti-viewport-tag">{channel} CH</div>
        </div>

        {/* AI Confidence & Classification */}
        <div className="ti-card">
          <div className="ti-card-row">
            <span className="ti-label">YOLO CLASSIFICATION</span>
            <span className="ti-val" style={{ color: meta.color }}>
              {selectedTarget.class || meta.label || selectedTarget.type?.toUpperCase()}
            </span>
          </div>
          <div className="ti-conf-bar-wrap">
            <div className="ti-conf-bar">
              <div
                className="ti-conf-fill"
                style={{
                  width: `${scorePct}%`,
                  background: scorePct >= 75 ? '#22c55e' : scorePct >= 50 ? '#facc15' : '#ef4444',
                }}
              />
            </div>
            <span className="ti-conf-pct">{scorePct}% MATCH</span>
          </div>
        </div>

        {/* Geotag & Hydrographic Telemetry */}
        <div className="ti-card">
          <div className="ti-card-row">
            <span className="ti-label">CHANNEL RETURN</span>
            <span className="ti-val ti-val--mono">{channel} [CH {channel === 'PORT' ? '1' : '2'}]</span>
          </div>
          <div className="ti-card-row">
            <span className="ti-label">FRAME / TIMESTAMP</span>
            <span className="ti-val ti-val--mono">{selectedTarget.frame || 'F-0428'} ({selectedTarget.timeS || '00:14.2'})</span>
          </div>
          <div className="ti-card-row">
            <span className="ti-label">EST. LATITUDE</span>
            <span className="ti-val ti-val--mono">
              {selectedTarget.geotag?.latitude ? `${Number(selectedTarget.geotag.latitude).toFixed(5)}° N` : '43.06123° N'}
            </span>
          </div>
          <div className="ti-card-row">
            <span className="ti-label">EST. LONGITUDE</span>
            <span className="ti-val ti-val--mono">
              {selectedTarget.geotag?.longitude ? `${Math.abs(Number(selectedTarget.geotag.longitude)).toFixed(5)}° W` : '70.71524° W'}
            </span>
          </div>
        </div>

        {/* Operator Verification Actions */}
        <div className="ti-actions-section">
          <span className="ti-section-title">OPERATOR VERIFICATION</span>
          <div className="ti-btn-group">
            <button
              type="button"
              className={`ti-btn ti-btn--accept ${selectedTarget.status === 'Operator accepted' ? 'ti-btn--active' : ''}`}
              onClick={() => onUpdateTargetStatus(selectedTarget.id, 'Operator accepted')}
            >
              Confirm Target
            </button>
            <button
              type="button"
              className={`ti-btn ti-btn--review ${selectedTarget.status === 'Pending Review' ? 'ti-btn--active' : ''}`}
              onClick={() => onUpdateTargetStatus(selectedTarget.id, 'Pending Review')}
            >
              Flag Review
            </button>
            <button
              type="button"
              className={`ti-btn ti-btn--reject ${selectedTarget.status === 'False Positive' ? 'ti-btn--active' : ''}`}
              onClick={() => onUpdateTargetStatus(selectedTarget.id, 'False Positive')}
            >
              Mark False Positive
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
