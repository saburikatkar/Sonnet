import React from 'react'
import './InfoStrip.css'

/**
 * InfoStrip — single-row telemetry bar (from Image 1 layout concept).
 * Receives navData from WebSocket or falls back to mock data.
 */
export default function InfoStrip({ navData = {} }) {
  const {
    altitude = '--', range = '--', freq = '--',
    temp = '--', depth = '--', ping = '--',
    course = '--', speed = '--', layback = '--',
    latitude = '--', longitude = '--',
  } = navData

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-GB', { hour12: false })
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

  const fields = [
    { label: 'ALT',     value: altitude !== '--' ? `${Number(altitude).toFixed(1)}m` : '--' },
    { label: 'RANGE',   value: range !== '--'    ? `${range}m`    : '--' },
    { label: 'FREQ',    value: freq !== '--'     ? `${freq}kHz`   : '--' },
    { label: 'TEMP',    value: temp !== '--'     ? `${temp}°C`    : '--' },
    { label: 'DEPTH',   value: depth !== '--'    ? `${Number(depth).toFixed(1)}m`   : '--' },
    { label: 'PING',    value: String(ping) },
    { label: 'TIME',    value: timeStr },
    { label: 'DATE',    value: dateStr },
    { label: 'COURSE',  value: course !== '--'   ? `${course}°`   : '--' },
    { label: 'SPEED',   value: speed !== '--'    ? `${speed}m/s`  : '--' },
    { label: 'LAYBACK', value: layback !== '--'  ? `${layback}m`  : '--' },
    { label: 'LAT',     value: latitude !== '--' ? `${Number(latitude).toFixed(4)}°N` : '--' },
    { label: 'LON',     value: longitude !== '--'? `${Math.abs(Number(longitude)).toFixed(4)}°W` : '--' },
  ]

  return (
    <div className="infostrip" role="status" aria-label="Navigation telemetry">
      {fields.map(({ label, value }, i) => (
        <React.Fragment key={label}>
          <div className="infostrip__field">
            <span className="infostrip__label">{label}</span>
            <span className="infostrip__value">{value}</span>
          </div>
          {i < fields.length - 1 && <div className="infostrip__sep" />}
        </React.Fragment>
      ))}
    </div>
  )
}
