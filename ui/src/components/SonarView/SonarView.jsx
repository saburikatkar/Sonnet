import React, { useRef, useEffect, useState, useCallback } from 'react'
import { DEFAULT_SONAR_IMAGE } from '../../mock/mockData'
import './SonarView.css'

/**
 * Returns canvas filter string for display settings (brightness, contrast, colormap)
 */
function getCanvasFilter(displaySettings) {
  const brightness = displaySettings?.brightness ?? 0
  const contrast = displaySettings?.contrast ?? 0
  const bVal = Math.max(0.2, 1 + brightness / 100)
  const cVal = Math.max(0.2, 1 + contrast / 100)
  const cm = displaySettings?.colorMap || 'MytisBronze'

  switch (cm) {
    case 'Greyscale':
      return `grayscale(100%) brightness(${bVal}) contrast(${cVal})`
    case 'Hot':
      return `sepia(100%) saturate(350%) hue-rotate(330deg) brightness(${bVal * 1.1}) contrast(${cVal * 1.2})`
    case 'Copper':
      return `sepia(90%) saturate(220%) hue-rotate(345deg) brightness(${bVal}) contrast(${cVal})`
    case 'MultiBronze':
      return `sepia(95%) saturate(260%) hue-rotate(355deg) brightness(${bVal * 1.05}) contrast(${cVal * 1.15})`
    case 'MytisBronze':
    default:
      return `sepia(85%) saturate(190%) hue-rotate(350deg) brightness(${bVal}) contrast(${cVal})`
  }
}

export default function SonarView({
  targets = [],
  selectedTargetId,
  onSelectTarget,
  onAddTarget,
  displaySettings,
  imageUrl,
  onFileSelected,
  onResetDemo,
  isProcessing,
  stageMessage,
  hasUploadedScan,
}) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const rafRef = useRef(null)
  const pingPosRef = useRef(0)
  const fileInputRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [showOverlays, setShowOverlays] = useState(true)
  const [isLiveScrolling, setIsLiveScrolling] = useState(true)
  const [hoveredTargetId, setHoveredTargetId] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const activeImageSrc = imageUrl || DEFAULT_SONAR_IMAGE

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && onFileSelected) {
      onFileSelected(file)
    }
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file && onFileSelected) {
      onFileSelected(file)
    }
    e.target.value = ''
  }

  // Load and render authentic side-scan sonar image with ping sweep
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let isMounted = true

    const img = new Image()
    if (!activeImageSrc.startsWith('blob:') && !activeImageSrc.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onerror = () => {
      console.warn('Failed to load sonar image:', activeImageSrc)
    }
    img.src = activeImageSrc

    img.onload = () => {
      if (!isMounted) return
      imgRef.current = img

      function render() {
        if (!isMounted) return
        const w = canvas.width
        const h = canvas.height

        ctx.clearRect(0, 0, w, h)
        ctx.filter = getCanvasFilter(displaySettings)

        // Draw authentic acoustic sonar scan
        ctx.drawImage(img, 0, 0, w, h)
        ctx.filter = 'none'

        // Render subtle real-time ping sweep bar in live mode
        if (isLiveScrolling) {
          pingPosRef.current = (pingPosRef.current + 0.8) % h
          const py = pingPosRef.current

          // Soft phosphorescent acoustic ping glow
          const grad = ctx.createLinearGradient(0, py - 18, 0, py + 2)
          grad.addColorStop(0, 'rgba(56, 189, 248, 0)')
          grad.addColorStop(0.85, 'rgba(56, 189, 248, 0.08)')
          grad.addColorStop(1, 'rgba(56, 189, 248, 0.45)')

          ctx.fillStyle = grad
          ctx.fillRect(0, Math.max(0, py - 18), w, 20)

          // Leading edge hairline
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(0, py)
          ctx.lineTo(w, py)
          ctx.stroke()
        }

        rafRef.current = requestAnimationFrame(render)
      }

      render()
    }

    return () => {
      isMounted = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [activeImageSrc, displaySettings, isLiveScrolling])

  // Normalize targets for bounding box rendering
  const normalizedTargets = (targets || []).map((t, idx) => {
    let bx = 0, by = 0, bw = 0, bh = 0
    if (t.bbox) {
      if (t.bbox.x_min != null && t.bbox.x_max != null) {
        bx = t.bbox.x_min
        by = t.bbox.y_min
        bw = Math.max(0.012, t.bbox.x_max - t.bbox.x_min)
        bh = Math.max(0.015, t.bbox.y_max - t.bbox.y_min)
      } else {
        bx = t.bbox.x ?? 0.3
        by = t.bbox.y ?? 0.3
        bw = t.bbox.w ?? 0.05
        bh = t.bbox.h ?? 0.12
      }
    }
    return {
      ...t,
      id: t.id || `TRK-${String(idx + 1).padStart(3, '0')}`,
      bbox: { x: bx, y: by, w: bw, h: bh },
      type: t.type || t.class_name || 'sonar_target',
      confidence: t.confidence ?? t.modelScore ?? 0.85,
      status: t.status || 'Detected',
    }
  })

  const confirmedCount = normalizedTargets.filter(
    t => t.status === 'Operator accepted' || t.status === 'Confirmed'
  ).length

  return (
    <div
      className="sonar-view"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 1. Header Toolbar */}
      <div className="sonar-view__titlebar">
        <div className="sonar-view__title-left">
          <span className={`sonar-view__indicator ${isLiveScrolling ? 'sonar-view__indicator--live' : ''}`} />
          <span className="sonar-view__title">Sidescan View (Live 780 kHz)</span>
        </div>

        <div className="sonar-view__toolbar">
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.tiff,.xtf,.jsf"
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />
          <button
            type="button"
            className="sonar-tb-btn sonar-tb-btn--upload"
            onClick={() => fileInputRef.current?.click()}
            title="Upload your own side-scan sonar image (.png, .jpg, .tiff) or raw log to run YOLO detection"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginRight: 4 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            UPLOAD SCAN
          </button>

          {hasUploadedScan && (
            <button
              type="button"
              className="sonar-tb-btn"
              onClick={onResetDemo}
              title="Reset to sample shipwreck scan"
            >
              DEMO SCAN
            </button>
          )}

          <span className="sonar-tb-sep" />

          <button
            type="button"
            className={`sonar-tb-btn ${isLiveScrolling ? 'sonar-tb-btn--active' : ''}`}
            onClick={() => setIsLiveScrolling(s => !s)}
            title={isLiveScrolling ? 'Pause Live Ping Sweep' : 'Resume Live Ping Sweep'}
          >
            {isLiveScrolling ? 'FREEZE' : 'LIVE'}
          </button>

          <span className="sonar-tb-sep" />

          <button
            type="button"
            className="sonar-tb-icon-btn"
            title="Zoom In"
            onClick={() => setZoom(z => Math.min(2.5, +(z + 0.2).toFixed(1)))}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <button
            type="button"
            className="sonar-tb-icon-btn"
            title="Zoom Out"
            onClick={() => setZoom(z => Math.max(0.6, +(z - 0.2).toFixed(1)))}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <button
            type="button"
            className="sonar-tb-icon-btn"
            title="Fit to Window"
            onClick={() => setZoom(1)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="M15 3v18" />
            </svg>
          </button>

          <span className="sonar-tb-sep" />

          <button
            type="button"
            className={`sonar-tb-btn ${showOverlays ? 'sonar-tb-btn--active' : ''}`}
            onClick={() => setShowOverlays(o => !o)}
            title="Toggle Target Bounding Boxes and HUD Reticles"
          >
            {showOverlays ? 'RETICLES: ON' : 'RETICLES: OFF'}
          </button>
        </div>
      </div>

      {/* Drag & Drop Visual Indicator */}
      {isDragOver && (
        <div className="sonar-dropzone-overlay">
          <div className="sonar-dropzone-modal">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00c2e0" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="sonar-dropzone-title">DROP SONAR IMAGE OR LOG HERE</span>
            <span className="sonar-dropzone-sub">YOLOv11s will immediately analyze and detect targets</span>
          </div>
        </div>
      )}

      {/* Real-time Analyzing HUD */}
      {isProcessing && (
        <div className="sonar-analyzing-overlay">
          <div className="sonar-analyzing-card">
            <div className="sonar-analyzing-spinner" />
            <span className="sonar-analyzing-title">YOLOv11s ANALYZING SCAN</span>
            <span className="sonar-analyzing-stage">{stageMessage || 'Running neural inference on side-scan imagery...'}</span>
          </div>
        </div>
      )}

      {/* Zero Targets In User Scan Notification */}
      {hasUploadedScan && !isProcessing && normalizedTargets.length === 0 && (
        <div className="sonar-no-targets-badge">
          0 ANOMALIES DETECTED IN THIS SCAN | LOWER CONFIDENCE IN SIDEBAR TO INSPECT WEAK RETURNS
        </div>
      )}

      {/* 2. Slant-Range Hydrographic Scale (Top Graticule) */}
      <div className="sonar-ruler">
        <span className="sonar-ruler__edge">PORT 100m</span>
        <span className="sonar-ruler__mark">-75m</span>
        <span className="sonar-ruler__mark">-50m</span>
        <span className="sonar-ruler__mark">-25m</span>
        <span className="sonar-ruler__nadir">NADIR 0m</span>
        <span className="sonar-ruler__mark">+25m</span>
        <span className="sonar-ruler__mark">+50m</span>
        <span className="sonar-ruler__mark">+75m</span>
        <span className="sonar-ruler__edge">100m STBD</span>
      </div>

      {/* 3. Stage: Canvas + HUD Overlays */}
      <div className="sonar-view__stage" style={{ transform: `scale(${zoom})` }}>
        <canvas
          ref={canvasRef}
          className="sonar-view__canvas"
          width={1376}
          height={768}
        />

        {/* Channel Watermark Badges */}
        <div className="sonar-ch-badge sonar-ch-badge--port">PORT CHANNEL [CH 1]</div>
        <div className="sonar-ch-badge sonar-ch-badge--starboard">STARBOARD CHANNEL [CH 2]</div>

        {/* Top-Left Telemetry Watermark */}
        <div className="sonar-watermark">
          SONNET | SIDESCAN SONAR TARGET DETECTION
        </div>

        {/* Top-Right Confirmed Targets Badge */}
        <div className="sonar-confirmed-badge">
          CONTACTS: {normalizedTargets.length} | CONFIRMED: {confirmedCount}
        </div>

        {/* Tactical Corner Reticles & Overlays */}
        {showOverlays && (
          <>
            <svg className="sonar-view__overlay" viewBox="0 0 1 1" preserveAspectRatio="none">
              {normalizedTargets.map(t => {
                const { bbox, id } = t
                const isSelected = id === selectedTargetId
                const isHovered = id === hoveredTargetId
                const cornerSizeX = Math.min(0.025, bbox.w * 0.35)
                const cornerSizeY = Math.min(0.035, bbox.h * 0.35)

                const strokeColor = isSelected ? '#00c2e0' : isHovered ? '#38bdf8' : '#f59e0b'
                const strokeW = isSelected ? 0.0035 : 0.0022

                return (
                  <g
                    key={id}
                    className="sonar-det-reticle"
                    onClick={() => onSelectTarget?.(id)}
                    onMouseEnter={() => setHoveredTargetId(id)}
                    onMouseLeave={() => setHoveredTargetId(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Subtle Target Footprint Highlight */}
                    <rect
                      x={bbox.x}
                      y={bbox.y}
                      width={bbox.w}
                      height={bbox.h}
                      fill={isSelected ? 'rgba(0, 194, 224, 0.12)' : 'rgba(245, 158, 11, 0.04)'}
                      stroke={isSelected ? 'rgba(0, 194, 224, 0.4)' : 'rgba(245, 158, 11, 0.2)'}
                      strokeWidth="0.001"
                      strokeDasharray="0.004 0.003"
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Top-Left Corner Bracket */}
                    <path
                      d={`M ${bbox.x + cornerSizeX} ${bbox.y} L ${bbox.x} ${bbox.y} L ${bbox.x} ${bbox.y + cornerSizeY}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeW}
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Top-Right Corner Bracket */}
                    <path
                      d={`M ${bbox.x + bbox.w - cornerSizeX} ${bbox.y} L ${bbox.x + bbox.w} ${bbox.y} L ${bbox.x + bbox.w} ${bbox.y + cornerSizeY}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeW}
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Bottom-Left Corner Bracket */}
                    <path
                      d={`M ${bbox.x} ${bbox.y + bbox.h - cornerSizeY} L ${bbox.x} ${bbox.y + bbox.h} L ${bbox.x + cornerSizeX} ${bbox.y + bbox.h}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeW}
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Bottom-Right Corner Bracket */}
                    <path
                      d={`M ${bbox.x + bbox.w} ${bbox.y + bbox.h - cornerSizeY} L ${bbox.x + bbox.w} ${bbox.y + bbox.h} L ${bbox.x + bbox.w - cornerSizeX} ${bbox.y + bbox.h}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeW}
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Center Crosshair Reticle for Selected Target */}
                    {isSelected && (
                      <g opacity="0.85">
                        <line
                          x1={bbox.x + bbox.w / 2 - 0.008}
                          y1={bbox.y + bbox.h / 2}
                          x2={bbox.x + bbox.w / 2 + 0.008}
                          y2={bbox.y + bbox.h / 2}
                          stroke="#00c2e0"
                          strokeWidth="0.002"
                          vectorEffect="non-scaling-stroke"
                        />
                        <line
                          x1={bbox.x + bbox.w / 2}
                          y1={bbox.y + bbox.h / 2 - 0.012}
                          x2={bbox.x + bbox.w / 2}
                          y2={bbox.y + bbox.h / 2 + 0.012}
                          stroke="#00c2e0"
                          strokeWidth="0.002"
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Tactical HUD Chip Labels */}
            {normalizedTargets.map(t => {
              const { bbox, id } = t
              const isSelected = id === selectedTargetId
              const isHovered = id === hoveredTargetId
              const labelType = t.type ? t.type.toUpperCase().replace('_', ' ') : 'SONAR TARGET'
              const confText = `${(t.confidence * 100).toFixed(1)}%`
              const sideText = t.side || (bbox.x < 0.5 ? 'PORT' : 'STBD')

              return (
                <div
                  key={id}
                  className={`sonar-tactical-chip ${isSelected ? 'sonar-tactical-chip--selected' : ''} ${isHovered ? 'sonar-tactical-chip--hovered' : ''}`}
                  style={{
                    left: `${Math.min(92, Math.max(1, bbox.x * 100))}%`,
                    top: `${Math.min(94, Math.max(1, bbox.y * 100))}%`,
                  }}
                  onClick={() => onSelectTarget?.(id)}
                  onMouseEnter={() => setHoveredTargetId(id)}
                  onMouseLeave={() => setHoveredTargetId(null)}
                >
                  <div className="sonar-chip-header">
                    <span className="sonar-chip-bullet" />
                    <span className="sonar-chip-id">{id}</span>
                    <span className="sonar-chip-type">{labelType}</span>
                    <span className="sonar-chip-conf">{confText}</span>
                  </div>
                  {isSelected && (
                    <div className="sonar-chip-sub">
                      <span>{sideText} CH</span>
                      <span>•</span>
                      <span>{t.status.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* Bottom Telemetry HUD */}
        <div className="sonar-towfish-alt">
          TOWFISH 3.2m ALT | 2.1 kts | 780 kHz CHIRP | DGPS FIX
        </div>
      </div>
    </div>
  )
}
