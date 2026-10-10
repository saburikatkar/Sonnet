import React from 'react'

export default function NavigationPanel({ navData = {} }) {
  const fields = [
    { label: 'Latitude:',  value: navData.latitude  != null ? `${Number(navData.latitude).toFixed(5)} N`  : '43.06123 N' },
    { label: 'Longitude:', value: navData.longitude != null ? `${Math.abs(Number(navData.longitude)).toFixed(5)} W` : '70.71524 W' },
    { label: 'Heading:',   value: navData.heading   != null ? `${Number(navData.heading).toFixed(1)}°`     : '354.8°' },
    { label: 'Depth:',     value: navData.depth     != null ? `${Number(navData.depth).toFixed(1)} m`      : '18.2 m' },
    { label: 'Altitude:',  value: navData.altitude  != null ? `${Number(navData.altitude).toFixed(1)} m`   : '3.2 m' },
  ]

  return (
    <div className="sb-controls sb-nav-controls">
      {fields.map(({ label, value }) => (
        <div key={label} className="sb-row sb-row--between sb-nav-row">
          <span className="sb-label sb-label--nav">{label}</span>
          <span className="sb-value sb-value--mono">{value}</span>
        </div>
      ))}
    </div>
  )
}
