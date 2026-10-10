import React from 'react'

export default function NavigationPanel({ navData = {}, dgpsFix }) {
  const fields = [
    { label: 'Latitude',  value: navData.latitude  != null ? `${navData.latitude.toFixed(5)} N`  : '--' },
    { label: 'Longitude', value: navData.longitude != null ? `${Math.abs(navData.longitude).toFixed(5)} W` : '--' },
    { label: 'Heading',   value: navData.heading   != null ? `${navData.heading.toFixed(1)}°`     : '--' },
    { label: 'Depth',     value: navData.depth     != null ? `${navData.depth.toFixed(1)} m`      : '--' },
    { label: 'Altitude',  value: navData.altitude  != null ? `${navData.altitude.toFixed(1)} m`   : '--' },
  ]
  return (
    <div className="sb-controls">
      {/* DGPS fix badge */}
      <div className={`sb-badge ${dgpsFix ? 'sb-badge--green' : 'sb-badge--red'}`}>
        {dgpsFix ? 'DGPS FIX' : 'NO FIX'}
      </div>
      {/* Nav fields */}
      {fields.map(({ label, value }) => (
        <div key={label} className="sb-row sb-row--between sb-nav-row">
          <span className="sb-label">{label}</span>
          <span className="sb-value sb-value--mono">{value}</span>
        </div>
      ))}
    </div>
  )
}
