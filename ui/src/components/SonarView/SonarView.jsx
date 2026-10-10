import React, { useRef, useEffect, useState, useCallback } from 'react'
import './SonarView.css'

const NADIR_FRAC = 0.038 // Nadir width fraction

/**
 * Computes high-fidelity copper / bronze colormap matching MytisBronze
 */
function copperColor(v, brightness = 0, contrast = 0, gamma = 1.0) {
  // Apply brightness (-100..100) and contrast (-100..100)
  let val = v + (brightness / 200)
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  val = factor * (val - 0.5) + 0.5
  val = Math.max(0, Math.min(1, val))

  // Apply gamma
  if (gamma !== 1.0 && gamma > 0) {
    val = Math.pow(val, 1.0 / gamma)
  }

  // MytisBronze palette curve
  if (val < 0.18) {
    const t = val / 0.18
    return `rgb(${Math.round(20 * t)},${Math.round(6 * t)},${Math.round(2 * t)})`
  } else if (val < 0.50) {
    const t = (val - 0.18) / 0.32
    return `rgb(${Math.round(20 + 130 * t)},${Math.round(6 + 48 * t)},${Math.round(2 + 10 * t)})`
  } else if (val < 0.82) {
    const t = (val - 0.50) / 0.32
    return `rgb(${Math.round(150 + 75 * t)},${Math.round(54 + 65 * t)},${Math.round(12 + 20 * t)})`
  } else {
    const t = (val - 0.82) / 0.18
    return `rgb(${Math.round(225 + 30 * t)},${Math.round(119 + 70 * t)},${Math.round(32 + 50 * t)})`
  }
}

/**
 * Renders an authentic Side-Scan Sonar waterfall frame with center nadir,
 * acoustic shadows, and realistic seabed acoustic backscatter.
 */
function drawSonarFrame(ctx, w, h, offsetY, displaySettings) {
  const nadirX = w / 2
  const nadirHalfW = (w * NADIR_FRAC) / 2
  const brightness = displaySettings?.brightness ?? 0
  const contrast = displaySettings?.contrast ?? 0
  const gamma = displaySettings?.gamma ?? 1.0

  const rowH = 2
  for (let y = 0; y < h; y += rowH) {
    const scrollT = (y + offsetY) / h

    // 1. Port side (left channel)
    for (let x = 0; x < nadirX - nadirHalfW; x += 2) {
      const distFromNadir = (nadirX - nadirHalfW - x) / (nadirX - nadirHalfW)
      
      // Seabed reverberation noise + sand ripples
      const ripple = Math.sin(x * 0.04 + scrollT * 14 + y * 0.02) * 0.12
      const texture = Math.sin(x * 0.12 + scrollT * 8) * 0.08 + Math.cos(x * 0.22 + y * 0.06) * 0.06
      
      // Target 1: Port acoustic feature (vertical cylinder/debris at x=32%, y=25%..45%)
      let objectFeature = 0
      const inTgt1Y = (y / h) >= 0.24 && (y / h) <= 0.46
      const inTgt1X = (x / w) >= 0.315 && (x / w) <= 0.342
      const inTgt1Shadow = (y / h) >= 0.25 && (y / h) <= 0.45 && (x / w) >= 0.26 && (x / w) < 0.315

      if (inTgt1X && inTgt1Y) {
        objectFeature = 0.45 // High metallic/hard return
      } else if (inTgt1Shadow) {
        objectFeature = -0.55 // Deep acoustic shadow (sound blocked)
      }

      let intensity = 0.50 + ripple + texture - (distFromNadir * 0.18) + objectFeature
      intensity = Math.max(0, Math.min(1, intensity))

      ctx.fillStyle = copperColor(intensity, brightness, contrast, gamma)
      ctx.fillRect(x, y, 2, rowH)
    }

    // 2. Starboard side (right channel)
    for (let x = nadirX + nadirHalfW; x < w; x += 2) {
      const distFromNadir = (x - (nadirX + nadirHalfW)) / (w - (nadirX + nadirHalfW))

      const ripple = Math.sin(x * 0.035 - scrollT * 12 + y * 0.018) * 0.12
      const texture = Math.sin(x * 0.11 + scrollT * 9) * 0.08 + Math.cos(x * 0.19 + y * 0.05) * 0.06

      // Target 2: Starboard shipwreck/cluster at x=54%, y=15%..26%
      let objectFeature = 0
      const inTgt2Y = (y / h) >= 0.14 && (y / h) <= 0.265
      const inTgt2X = (x / w) >= 0.535 && (x / w) <= 0.565
      const inTgt2Shadow = (y / h) >= 0.15 && (y / h) <= 0.26 && (x / w) > 0.565 && (x / w) <= 0.62

      if (inTgt2X && inTgt2Y) {
        objectFeature = 0.50 // High wreck return
      } else if (inTgt2Shadow) {
        objectFeature = -0.55 // Acoustic shadow behind wreck
      }

      let intensity = 0.48 + ripple + texture - (distFromNadir * 0.16) + objectFeature
      intensity = Math.max(0, Math.min(1, intensity))

      ctx.fillStyle = copperColor(intensity, brightness, contrast, gamma)
      ctx.fillRect(x, y, 2, rowH)
    }

    // 3. Nadir Water Column (Center Deep Black)
    ctx.fillStyle = '#050302'
    ctx.fillRect(nadirX - nadirHalfW, y, nadirHalfW * 2, rowH)
  }

  // 4. White Altitude Contour Tracking Lines (Flanking the nadir)
  ctx.strokeStyle = '#f8fafc'
  ctx.lineWidth = 1.2
  ctx.shadowColor = '#ffffff'
  ctx.shadowBlur = 3

  // Port nadir edge
  ctx.beginPath()
  for (let y = 0; y < h; y += 8) {
    const jitter = Math.sin(y * 0.08 + offsetY * 0.1) * 2.5
    const px = nadirX - nadirHalfW + jitter
    if (y === 0) ctx.moveTo(px, y)
    else ctx.lineTo(px, y)
  }
  ctx.stroke()

  // Starboard nadir edge
  ctx.beginPath()
  for (let y = 0; y < h; y += 8) {
    const jitter = Math.cos(y * 0.09 + offsetY * 0.12) * 2.5
    const px = nadirX + nadirHalfW + jitter
    if (y === 0) ctx.moveTo(px, y)
    else ctx.lineTo(px, y)
  }
  ctx.stroke()

  ctx.shadowBlur = 0 // Reset shadow
}

export default function SonarView({
  targets = [],
  selectedTargetId,
  onSelectTarget,
  onAddTarget,
  displaySettings,
}) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const offsetRef = useRef(0)
  const [zoom, setZoom] = useState(1)
  const [range, setRange] = useState(100)
  const [gain, setGain] = useState('Auto')

  // Animated waterfall
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let running = true

    function loop() {
      if (!running) return
      const { width, height } = canvas
      drawSonarFrame(ctx, width, height, offsetRef.current, displaySettings)
      offsetRef.current = (offsetRef.current + 0.35) % height
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()
    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [displaySettings])

  // Get confirmed targets count (in image: CONFIRMED TARGETS: 2)
  const confirmedCount = 2

  // Visible confirmed targets on waterfall
  const visibleTargets = [
    {
      id: 'TRK-071',
      bbox: { x: 0.315, y: 0.248, w: 0.027, h: 0.202 },
      status: 'Detected',
    },
    {
      id: 'TRK-083',
      bbox: { x: 0.535, y: 0.145, w: 0.030, h: 0.117 },
      status: 'Operator accepted',
    },
  ]

  return (
    <div className="sonar-view">
      {/* Title bar / Controls */}
      <div className="sonar-view__titlebar">
        <div className="sonar-view__title-left">
          <span className="sonar-view__indicator" />
          <span className="sonar-view__title">Sidescan View (Live)</span>
        </div>

        <div className="sonar-view__toolbar">
          <button className="sonar-tb-icon-btn" title="Zoom In" onClick={() => setZoom(z => Math.min(2.5, z + 0.2))}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <button className="sonar-tb-icon-btn" title="Zoom Out" onClick={() => setZoom(z => Math.max(0.6, z - 0.2))}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <button className="sonar-tb-icon-btn" title="Reset Fit" onClick={() => setZoom(1)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="M15 3v18" />
            </svg>
          </button>

          <span className="sonar-tb-sep" />

          <span className="sonar-tb-label">Range:</span>
          <select className="sonar-tb-select" value={range} onChange={e => setRange(+e.target.value)}>
            {[50, 75, 100, 150, 200].map(r => <option key={r} value={r}>{r} m</option>)}
          </select>

          <span className="sonar-tb-label">Gain:</span>
          <select className="sonar-tb-select" value={gain} onChange={e => setGain(e.target.value)}>
            {['Auto', '-6 dB', '0 dB', '+6 dB', '+12 dB'].map(g => <option key={g}>{g}</option>)}
          </select>

          <button className="sonar-tb-icon-btn" title="Display Settings">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stage: Canvas + Overlays */}
      <div className="sonar-view__stage" style={{ transform: `scale(${zoom})` }}>
        <canvas
          ref={canvasRef}
          className="sonar-view__canvas"
          width={840}
          height={520}
        />

        {/* Top-Left Watermark Overlay */}
        <div className="sonar-watermark">
          TARANG | SINGLE-MODEL SONAR TARGET DETECTION
        </div>

        {/* Top-Right Confirmed Targets Badge */}
        <div className="sonar-confirmed-badge">
          CONFIRMED TARGETS: {confirmedCount}
        </div>

        {/* Bounding Box Overlays */}
        <svg className="sonar-view__overlay" viewBox="0 0 1 1" preserveAspectRatio="none">
          {visibleTargets.map(t => {
            const { bbox, id } = t
            const isSelected = id === selectedTargetId
            return (
              <g
                key={id}
                className="sonar-det-group"
                onClick={() => onSelectTarget?.(id)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={bbox.x}
                  y={bbox.y}
                  width={bbox.w}
                  height={bbox.h}
                  fill={isSelected ? 'rgba(245, 196, 0, 0.12)' : 'transparent'}
                  stroke="#f5c400"
                  strokeWidth="0.0035"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )
          })}
        </svg>

        {/* Target Labels with Yellow Banner */}
        {visibleTargets.map(t => {
          const { bbox, id } = t
          const isSelected = id === selectedTargetId
          return (
            <div
              key={id}
              className={`sonar-target-tag ${isSelected ? 'sonar-target-tag--selected' : ''}`}
              style={{
                left: `${bbox.x * 100}%`,
                top: `${bbox.y * 100}%`,
              }}
              onClick={() => onSelectTarget?.(id)}
            >
              SONAR TARGET
            </div>
          )
        })}

        {/* Bottom-Left Altitude Overlay */}
        <div className="sonar-towfish-alt">
          TOWFISH 3.2m ALT
        </div>
      </div>
    </div>
  )
}
