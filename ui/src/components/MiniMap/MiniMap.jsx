import React, { useId } from 'react'
import { MOCK_SURVEY_LINES, MOCK_ROV_TRACK } from '../../mock/mockData'
import './MiniMap.css'

// TODO: replace MOCK_SURVEY_LINES and MOCK_ROV_TRACK with live backend data

const W = 240, H = 200  // SVG viewBox

export default function MiniMap({ targets = [], selectedTargetId }) {
  const gridId = `minimap-grid-${useId().replace(/:/g,'')}`

  const trackPath = MOCK_ROV_TRACK.map((p, i) => `${i===0?'M':'L'} ${p[0]} ${p[1]}`).join(' ')

  return (
    <div className="minimap">
      <div className="minimap__header">
        <span className="minimap__title">Map</span>
        <div className="minimap__controls">
          <button type="button" className="mm-btn" title="Zoom in">+</button>
          <button type="button" className="mm-btn" title="Zoom out">−</button>
          <span className="mm-label">North Up</span>
        </div>
      </div>

      <div className="minimap__stage">
        <svg viewBox={`0 0 ${W} ${H}`} className="minimap__svg">
          <defs>
            <pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a2d3e" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Background */}
          <rect width={W} height={H} fill="#080f18" />
          <rect width={W} height={H} fill={`url(#${gridId})`} />

          {/* Survey lines */}
          {MOCK_SURVEY_LINES.map(l => (
            <line key={l.id}
              x1={l.start[0]} y1={l.start[1]} x2={l.end[0]} y2={l.end[1]}
              stroke="#1a4060" strokeWidth="1.2" />
          ))}

          {/* Active survey line highlight */}
          <line x1={60} y1={70} x2={200} y2={70} stroke="#00c2e0" strokeWidth="1.5" opacity="0.7" />

          {/* ROV track */}
          <path d={trackPath} fill="none" stroke="#00c2e0" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />

          {/* Target markers */}
          {targets.map(t => {
            const mx = 60 + (t.bbox?.x || 0.5) * 140
            const my = 50 + (t.bbox?.y || 0.5) * 120
            const isSelected = t.id === selectedTargetId
            return (
              <g key={t.id}>
                <polygon
                  points={`${mx},${my-5} ${mx+4},${my+4} ${mx-4},${my+4}`}
                  fill={isSelected ? '#22c55e' : '#f5c400'}
                  stroke={isSelected ? '#16a34a' : '#c8a000'}
                  strokeWidth="0.8"
                />
              </g>
            )
          })}

          {/* Vessel/ROV diamond */}
          <polygon
            points="148,44 152,48 148,52 144,48"
            fill="#00c2e0" stroke="#ffffff" strokeWidth="1"
          />

          {/* Restricted zone label */}
          <rect x="50" y="120" width="80" height="18" fill="rgba(239,68,68,0.12)" stroke="rgba(239,68,68,0.4)" strokeWidth="0.8" rx="2" />
          <text x="90" y="132" textAnchor="middle" fontSize="7" fill="#ef4444" fontFamily="sans-serif" fontWeight="600" letterSpacing="0.5">RESTRICTED ZONE</text>

          {/* North arrow */}
          <g transform={`translate(${W-18}, 14)`}>
            <polygon points="0,-8 3,0 0,-2 -3,0" fill="#c8d6e5" />
            <polygon points="0,8 3,0 0,2 -3,0" fill="#3a5a7a" />
            <text x="0" y="-10" textAnchor="middle" fontSize="8" fill="#c8d6e5" fontFamily="sans-serif" fontWeight="700">N</text>
          </g>

          {/* Scale bar */}
          <g transform={`translate(8, ${H-14})`}>
            <line x1="0" y1="0" x2="40" y2="0" stroke="#5a7a9a" strokeWidth="1.5" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#5a7a9a" strokeWidth="1" />
            <line x1="40" y1="-3" x2="40" y2="3" stroke="#5a7a9a" strokeWidth="1" />
            <text x="20" y="-5" textAnchor="middle" fontSize="7" fill="#5a7a9a" fontFamily="sans-serif">500m</text>
          </g>
        </svg>
      </div>
    </div>
  )
}
