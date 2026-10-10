import React, { useRef, useEffect, useState, useCallback } from 'react'
import './SonarView.css'

const NADIR_FRAC = 0.03  // fraction of width for nadir gap

/** Renders an animated copper-colormap waterfall on a canvas */
function drawSonarFrame(ctx, w, h, offsetY, targets, selectedId) {
  const nadirX = w / 2
  const nadirW = w * NADIR_FRAC

  // Draw waterfall rows
  const rowH = 2
  for (let y = 0; y < h; y += rowH) {
    const t = (y + offsetY) / h  // 0..1 scroll parameter
    // Port side (left) — values decrease from nadir outward
    for (let x = 0; x < nadirX - nadirW / 2; x++) {
      const frac = 1 - (x / (nadirX - nadirW / 2))
      const noise = Math.sin(x * 0.08 + t * 12) * 0.15 + Math.sin(x * 0.03 + t * 7 + y * 0.01) * 0.25
      const v = Math.max(0, Math.min(1, 0.65 + noise * frac))
      ctx.fillStyle = copperColor(v)
      ctx.fillRect(x, y, 1, rowH)
    }
    // Starboard side (right)
    for (let x = nadirX + nadirW / 2; x < w; x++) {
      const frac = (x - nadirX - nadirW / 2) / (w - nadirX - nadirW / 2)
      const noise = Math.sin(x * 0.07 + t * 11) * 0.18 + Math.sin(x * 0.04 + t * 8 + y * 0.012) * 0.22
      const v = Math.max(0, Math.min(1, 0.6 + noise * (1 - frac)))
      ctx.fillStyle = copperColor(v)
      ctx.fillRect(x, y, 1, rowH)
    }
    // Nadir gap (bright white/near-white)
    ctx.fillStyle = '#c8e8f8'
    ctx.fillRect(nadirX - nadirW / 2, y, nadirW, rowH)
  }
}

function copperColor(v) {
  // Copper colormap: black → dark brown → orange → bright orange
  if (v < 0.25) {
    const t = v / 0.25
    return `rgb(${Math.round(26*t)},${Math.round(8*t)},0)`
  } else if (v < 0.6) {
    const t = (v - 0.25) / 0.35
    return `rgb(${Math.round(26+150*t)},${Math.round(8+48*t)},${Math.round(t*6)})`
  } else {
    const t = (v - 0.6) / 0.4
    return `rgb(${Math.round(176+56*t)},${Math.round(56+104*t)},${Math.round(6+20*t)})`
  }
}

export default function SonarView({ targets = [], selectedTargetId, onSelectTarget, onAddTarget, displaySettings }) {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const offsetRef = useRef(0)
  const [zoom, setZoom]       = useState(1)
  const [range, setRange]     = useState(100)
  const [gain, setGain]       = useState('Auto')
  const [clickMarker, setClickMarker] = useState(null)

  // Animated waterfall
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let running = true

    function loop() {
      if (!running) return
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      drawSonarFrame(ctx, width, height, offsetRef.current, targets, selectedTargetId)
      offsetRef.current = (offsetRef.current + 0.4) % height
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()
    return () => { running = false; cancelAnimationFrame(rafRef.current) }
  }, [])

  // Click to place a target marker
  const handleCanvasClick = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top)  / rect.height
    setClickMarker({ x, y })
    if (onAddTarget) {
      onAddTarget({
        id: `TRK-${String(Date.now()).slice(-3)}`,
        type: 'sonar',
        class: 'Sonar target',
        modelScore: 0,
        roi: x < 0.5 ? 'port' : 'starboard',
        timeS: new Date().toISOString().slice(14, 19),
        frame: `F-${Math.floor(Math.random() * 9000 + 1000)}`,
        status: 'Pending Review',
        bbox: { x: x - 0.03, y: y - 0.08, w: 0.06, h: 0.16 },
        side: x < 0.5 ? 'port' : 'starboard',
        confidence: 0,
      })
    }
  }, [onAddTarget])

  const confirmedCount = targets.filter(t => t.status === 'Operator accepted').length

  return (
    <div className="sonar-view">
      {/* Title bar */}
      <div className="sonar-view__titlebar">
        <div className="sonar-view__title-left">
          <span className="sonar-view__indicator" />
          <span className="sonar-view__title">Sidescan View (Live)</span>
          <span className="sonar-view__subtitle">SONARAI · SINGLE-MODEL SONAR TARGET DETECTION</span>
        </div>
        {confirmedCount > 0 && (
          <div className="sonar-view__confirmed-badge">
            CONFIRMED TARGETS: {confirmedCount}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="sonar-view__toolbar">
        <button className="sonar-tb-btn" title="Zoom out" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>🔍–</button>
        <button className="sonar-tb-btn" title="Fit"      onClick={() => setZoom(1)}>⊞</button>
        <button className="sonar-tb-btn" title="Zoom in"  onClick={() => setZoom(z => Math.min(4, z + 0.25))}>🔍+</button>
        <span className="sonar-tb-sep" />
        <span className="sonar-tb-label">Range</span>
        <select className="sonar-tb-select" value={range} onChange={e => setRange(+e.target.value)}>
          {[25, 50, 100, 200, 400].map(r => <option key={r} value={r}>{r} m</option>)}
        </select>
        <span className="sonar-tb-label">Gain</span>
        <select className="sonar-tb-select" value={gain} onChange={e => setGain(e.target.value)}>
          {['Auto', '-6 dB', '0 dB', '+6 dB', '+12 dB'].map(g => <option key={g}>{g}</option>)}
        </select>
      </div>

      {/* Canvas + detection overlay */}
      <div className="sonar-view__stage" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
        <canvas
          ref={canvasRef}
          className="sonar-view__canvas"
          width={800}
          height={520}
          onClick={handleCanvasClick}
          title="Click to place target marker"
        />

        {/* Detection boxes overlay */}
        <svg className="sonar-view__overlay" viewBox="0 0 1 1" preserveAspectRatio="none">
          {targets.map(t => {
            const { bbox, id, status } = t
            if (!bbox) return null
            const isSelected = id === selectedTargetId
            return (
              <g key={id} className="sonar-det-group" onClick={() => onSelectTarget(id)} style={{ cursor: 'pointer' }}>
                <rect
                  x={bbox.x} y={bbox.y} width={bbox.w} height={bbox.h}
                  fill={isSelected ? 'rgba(245,196,0,0.08)' : 'transparent'}
                  stroke={status === 'Operator accepted' ? '#22c55e' : '#f5c400'}
                  strokeWidth="0.004"
                  vectorEffect="non-scaling-stroke"
                />
                {/* Label background + text as foreignObject is tricky in SVG; use absolute div overlays instead */}
              </g>
            )
          })}
        </svg>

        {/* Target label overlays (positioned via %) */}
        {targets.map(t => {
          if (!t.bbox) return null
          const isSelected = t.id === selectedTargetId
          return (
            <div
              key={t.id}
              className={`sonar-target-label ${isSelected ? 'sonar-target-label--selected' : ''}`}
              style={{
                left: `${t.bbox.x * 100}%`,
                top:  `${t.bbox.y * 100}%`,
              }}
              onClick={() => onSelectTarget(t.id)}
            >
              SONAR TARGET
            </div>
          )
        })}

        {/* Click-to-mark crosshair */}
        {clickMarker && (
          <div className="sonar-click-marker"
            style={{ left: `${clickMarker.x * 100}%`, top: `${clickMarker.y * 100}%` }}>
            <span className="sonar-click-marker__cross">+</span>
            <span className="sonar-click-marker__label">Target</span>
          </div>
        )}
      </div>

      {/* Port / Starboard axis labels */}
      <div className="sonar-view__axis">
        <span className="sonar-axis-label">◀ PORT</span>
        <span className="sonar-axis-label">STARBOARD ▶</span>
      </div>
    </div>
  )
}
