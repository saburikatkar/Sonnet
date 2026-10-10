import React, { useId } from 'react'
import { MOCK_SURVEY_LINES, MOCK_ROV_TRACK } from '../../mock/mockData'
import './MiniMap.css'

const W = 280, H = 220 // SVG viewBox

export default function MiniMap({ targets = [], selectedTargetId, onSelectTarget }) {
  const gridId = `minimap-grid-${useId().replace(/:/g, '')}`

  const trackPath = MOCK_ROV_TRACK.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')

  return (
    <div className="minimap">
      <div className="minimap__header">
        <span className="minimap__title">Map</span>
        <div className="minimap__controls">
          <button type="button" className="mm-btn" title="Zoom in">+</button>
          <button type="button" className="mm-btn" title="Zoom out">−</button>
          <button type="button" className="mm-btn" title="Center">⌖</button>
          <span className="mm-label">North Up ▾</span>
        </div>
      </div>

      <div className="minimap__stage">
        <svg viewBox={`0 0 ${W} ${H}`} className="minimap__svg">
          <defs>
            <pattern id={gridId} width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#122538" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Deep nautical chart background */}
          <rect width={W} height={H} fill="#06111e" />
          <rect width={W} height={H} fill={`url(#${gridId})`} />

          {/* Bathymetric contours / Iso-depth curves */}
          <path d="M 0,40 Q 90,60 170,25 T 280,45" fill="none" stroke="#0e2a44" strokeWidth="1" strokeDasharray="4 3" />
          <path d="M 0,95 Q 110,120 190,80 T 280,105" fill="none" stroke="#0e2a44" strokeWidth="1" strokeDasharray="4 3" />
          <path d="M 0,160 Q 80,140 180,175 T 280,150" fill="none" stroke="#0e2a44" strokeWidth="1" strokeDasharray="4 3" />

          {/* Depth Soundings */}
          <text x="35" y="55" fontSize="7" fill="#1b3f60" fontFamily="monospace">17</text>
          <text x="120" y="85" fontSize="7" fill="#1b3f60" fontFamily="monospace">35</text>
          <text x="210" y="50" fontSize="7" fill="#1b3f60" fontFamily="monospace">48</text>
          <text x="75" y="145" fontSize="7" fill="#1b3f60" fontFamily="monospace">22</text>
          <text x="240" y="135" fontSize="7" fill="#1b3f60" fontFamily="monospace">14</text>

          {/* Survey grid lines */}
          {MOCK_SURVEY_LINES.map(l => (
            <line
              key={l.id}
              x1={l.start[0]}
              y1={l.start[1]}
              x2={l.end[0]}
              y2={l.end[1]}
              stroke="#133552"
              strokeWidth="1.2"
            />
          ))}

          {/* Active Survey Line */}
          <line x1={60} y1={70} x2={200} y2={70} stroke="#00c2e0" strokeWidth="1.6" opacity="0.8" />

          {/* ROV vessel track */}
          <path d={trackPath} fill="none" stroke="#00c2e0" strokeWidth="1.2" strokeDasharray="4 2" opacity="0.8" />

          {/* Vessel ROV Diamond Marker + Tag */}
          <g transform="translate(148, 48)">
            <polygon points="0,-5 5,0 0,5 -5,0" fill="#00c2e0" stroke="#ffffff" strokeWidth="1" />
            <rect x="8" y="-7" width="56" height="13" fill="rgba(8, 20, 34, 0.85)" stroke="#00c2e0" strokeWidth="0.6" rx="2" />
            <text x="11" y="2.5" fontSize="6.5" fill="#e2e8f0" fontFamily="sans-serif" fontWeight="700">ROV-001 | 2.1kt</text>
          </g>

          {/* Target Detection Markers dynamically mapped */}
          {targets && targets.length > 0 ? (
            targets.map((t, idx) => {
              const bx = t.bbox?.x_min ?? t.bbox?.x ?? 0.3
              const by = t.bbox?.y_min ?? t.bbox?.y ?? 0.4
              // Map normalized coordinate to mini-map survey grid
              const mx = 60 + bx * 140
              const my = 42 + by * 68
              const isSelected = t.id === selectedTargetId
              return (
                <g
                  key={t.id || idx}
                  transform={`translate(${mx}, ${my})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectTarget?.(t.id)}
                >
                  {isSelected && (
                    <circle r="9" stroke="#00c2e0" strokeWidth="1.2" fill="none" strokeDasharray="3 2" opacity="0.9" />
                  )}
                  <polygon points="0,-6 6,0 0,6 -6,0" fill={isSelected ? "#00c2e0" : "#dc2626"} stroke="#fca5a5" strokeWidth="0.8" />
                  <line x1="-3" y1="0" x2="3" y2="0" stroke="#ffffff" strokeWidth="0.8" />
                  <line x1="0" y1="-3" x2="0" y2="3" stroke="#ffffff" strokeWidth="0.8" />
                  <text x="8" y="3" fontSize="5.5" fill={isSelected ? "#00c2e0" : "#e2e8f0"} fontFamily="monospace" fontWeight="700">
                    {t.id}
                  </text>
                </g>
              )
            })
          ) : (
            <>
              {/* Fallback baseline markers when survey targets pending */}
              <g transform="translate(110, 70)" style={{ cursor: 'pointer' }}>
                <polygon points="0,-6 6,0 0,6 -6,0" fill="#dc2626" stroke="#fca5a5" strokeWidth="0.8" />
                <line x1="-3" y1="0" x2="3" y2="0" stroke="#ffffff" strokeWidth="0.8" />
                <line x1="0" y1="-3" x2="0" y2="3" stroke="#ffffff" strokeWidth="0.8" />
              </g>

              <g transform="translate(165, 70)" style={{ cursor: 'pointer' }}>
                <polygon points="0,-6 6,0 0,6 -6,0" fill="#dc2626" stroke="#fca5a5" strokeWidth="0.8" />
                <line x1="-3" y1="0" x2="3" y2="0" stroke="#ffffff" strokeWidth="0.8" />
                <line x1="0" y1="-3" x2="0" y2="3" stroke="#ffffff" strokeWidth="0.8" />
              </g>
            </>
          )}

          {/* Restricted Zone Box */}
          <rect
            x="45"
            y="125"
            width="90"
            height="22"
            fill="rgba(239, 68, 68, 0.08)"
            stroke="#ef4444"
            strokeWidth="0.8"
            strokeDasharray="3 2"
            rx="2"
          />
          <text x="90" y="136" textAnchor="middle" fontSize="6" fill="#ef4444" fontFamily="sans-serif" fontWeight="700" letterSpacing="0.4">
            RESTRICTED ZONE
          </text>
          <text x="90" y="143" textAnchor="middle" fontSize="5" fill="#fca5a5" fontFamily="sans-serif">
            (see chart note B)
          </text>

          {/* North Arrow */}
          <g transform={`translate(${W - 20}, 18)`}>
            <polygon points="0,-9 3.5,0 0,-2.5 -3.5,0" fill="#cbd5e1" />
            <polygon points="0,9 3.5,0 0,2.5 -3.5,0" fill="#475569" />
            <text x="0" y="-11" textAnchor="middle" fontSize="7.5" fill="#cbd5e1" fontFamily="sans-serif" fontWeight="800">N</text>
          </g>

          {/* Scale Bar */}
          <g transform={`translate(10, ${H - 12})`}>
            <line x1="0" y1="0" x2="70" y2="0" stroke="#64748b" strokeWidth="1.5" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#64748b" strokeWidth="1" />
            <line x1="23" y1="-2" x2="23" y2="2" stroke="#64748b" strokeWidth="1" />
            <line x1="46" y1="-2" x2="46" y2="2" stroke="#64748b" strokeWidth="1" />
            <line x1="70" y1="-3" x2="70" y2="3" stroke="#64748b" strokeWidth="1" />
            <text x="0" y="-5" fontSize="5.5" fill="#64748b" fontFamily="sans-serif">0</text>
            <text x="23" y="-5" textAnchor="middle" fontSize="5.5" fill="#64748b" fontFamily="sans-serif">500</text>
            <text x="46" y="-5" textAnchor="middle" fontSize="5.5" fill="#64748b" fontFamily="sans-serif">1,000</text>
            <text x="70" y="-5" textAnchor="middle" fontSize="5.5" fill="#64748b" fontFamily="sans-serif">2,000 m</text>
          </g>
        </svg>
      </div>
    </div>
  )
}
