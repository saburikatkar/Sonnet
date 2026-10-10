import React, { useState } from 'react'
import { CLASS_META } from '../constants'

export default function GeospatialMap({
  detections = [],
  selectedDetectionId,
  onSelectDetection,
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null)

  // Filter detections with valid geotags
  const geotagged = detections.filter(
    (d) => d.geotag && typeof d.geotag.latitude === 'number' && typeof d.geotag.longitude === 'number'
  )

  if (geotagged.length === 0) {
    return (
      <div className="map-panel">
        <div className="map-panel__header">
          <h3 className="map-panel__title">Geospatial Plot (WGS84)</h3>
        </div>
        <div className="map-empty">
          <span className="map-empty__icon">🧭</span>
          <p>No navigational geotags available in current detection payload.</p>
        </div>
      </div>
    )
  }

  // Calculate bounding box for normalization onto the 500x300 SVG canvas
  const lats = geotagged.map((d) => d.geotag.latitude)
  const lons = geotagged.map((d) => d.geotag.longitude)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)

  const latSpan = Math.max(0.001, maxLat - minLat)
  const lonSpan = Math.max(0.001, maxLon - minLon)

  return (
    <div className="map-panel">
      <div className="map-panel__header">
        <h3 className="map-panel__title">Geospatial Plot (WGS84 Navigation)</h3>
        <span className="map-panel__subtitle">
          {geotagged.length} geotagged points &bull; Depth range:{' '}
          {Math.min(...geotagged.map((d) => d.geotag.depth_meters || 0)).toFixed(1)}m &ndash;{' '}
          {Math.max(...geotagged.map((d) => d.geotag.depth_meters || 0)).toFixed(1)}m
        </span>
      </div>

      <div className="map-stage">
        <svg viewBox="0 0 500 300" className="map-svg">
          {/* Nautical Grid Lines */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1f3349" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="500" height="300" fill="#08131f" />
          <rect width="500" height="300" fill="url(#grid)" />

          {/* Compass / Sonar Track Line */}
          <line x1="250" y1="20" x2="250" y2="280" stroke="#1f3349" strokeDasharray="4 4" />
          <line x1="20" y1="150" x2="480" y2="150" stroke="#1f3349" strokeDasharray="4 4" />

          {/* Geotagged Pins */}
          {geotagged.map((item) => {
            // Map lat/lon into SVG canvas with padding
            const x = 50 + ((item.geotag.longitude - minLon) / lonSpan) * 400
            const y = 250 - ((item.geotag.latitude - minLat) / latSpan) * 200
            const meta = CLASS_META[item.class_name] || CLASS_META.unknown
            const isSelected = selectedDetectionId === item.detection_id

            return (
              <g
                key={item.detection_id}
                className="map-pin"
                onClick={() => onSelectDetection(item.detection_id)}
                onMouseEnter={() => setHoveredPoint(item)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Sonar pulse ring for selected item */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r={14}
                    fill="none"
                    stroke={meta.color}
                    strokeWidth="1.5"
                    opacity="0.6"
                    className="pulse-ring"
                  />
                )}

                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 8 : 5}
                  fill={meta.color}
                  stroke="#ffffff"
                  strokeWidth={isSelected ? 2 : 1}
                />
              </g>
            )
          })}
        </svg>

        {/* Hover coordinate label */}
        {hoveredPoint && (
          <div className="map-tooltip">
            <strong>{CLASS_META[hoveredPoint.class_name]?.label || hoveredPoint.class_name}</strong>
            <p>
              Lat: {hoveredPoint.geotag.latitude.toFixed(5)}&deg; | Lon: {hoveredPoint.geotag.longitude.toFixed(5)}&deg;
            </p>
            <p>Depth: {hoveredPoint.geotag.depth_meters != null ? hoveredPoint.geotag.depth_meters.toFixed(1) : '--'}m | Conf: {(hoveredPoint.confidence * 100).toFixed(0)}%</p>
          </div>
        )}
      </div>
    </div>
  )
}
