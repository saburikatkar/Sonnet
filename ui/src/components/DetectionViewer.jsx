import React, { useRef, useState, useEffect } from 'react'
import { CLASS_META } from '../constants'

export default function DetectionViewer({
  imageUrl,
  detections = [],
  selectedDetectionId,
  onSelectDetection,
  confidenceThreshold,
  onThresholdChange,
}) {
  const containerRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [showLabels, setShowLabels] = useState(true)
  const [showConfidence, setShowConfidence] = useState(true)
  const [hoveredDetection, setHoveredDetection] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // Filter detections by confidence threshold
  const visibleDetections = detections.filter(
    (d) => d.confidence >= confidenceThreshold
  )

  function handleMouseMove(e, det) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      setTooltipPos({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top + 15,
      })
    }
    setHoveredDetection(det)
  }

  function handleMouseLeave() {
    setHoveredDetection(null)
  }

  return (
    <div className="viewer-panel">
      {/* Viewer Controls Toolbar */}
      <div className="viewer-toolbar">
        <div className="viewer-toolbar__group">
          <label className="toolbar-label">Confidence Filter: {(confidenceThreshold * 100).toFixed(0)}%</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={confidenceThreshold}
            onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
            className="slider"
          />
        </div>

        <div className="viewer-toolbar__group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
            Labels
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showConfidence}
              onChange={(e) => setShowConfidence(e.target.checked)}
            />
            Confidence
          </label>
        </div>

        <div className="viewer-toolbar__group viewer-toolbar__zoom">
          <button
            type="button"
            className="btn btn--secondary btn--xs"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            title="Zoom Out"
          >
            &minus;
          </button>
          <span className="zoom-text">{(zoom * 100).toFixed(0)}%</span>
          <button
            type="button"
            className="btn btn--secondary btn--xs"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            title="Zoom In"
          >
            &#43;
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--xs"
            onClick={() => setZoom(1)}
            title="Reset Zoom"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Image & Bounding Box Overlay Area */}
      <div
        ref={containerRef}
        className="viewer-stage"
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="viewer-content"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="Sonar Scan" className="viewer-image" />
          ) : (
            <div className="viewer-placeholder">
              <span className="placeholder-icon">📡</span>
              <p>Sonar log loaded. Normalized overlay coordinates mapped.</p>
            </div>
          )}

          {/* SVG Overlay for Vector Bounding Boxes */}
          <svg className="viewer-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            {visibleDetections.map((det) => {
              const bbox = det.bbox || { x_min: 0, y_min: 0, x_max: 0, y_max: 0 }
              const x = bbox.x_min * 1000
              const y = bbox.y_min * 1000
              const width = Math.max(10, (bbox.x_max - bbox.x_min) * 1000)
              const height = Math.max(10, (bbox.y_max - bbox.y_min) * 1000)
              const meta = CLASS_META[det.class_name] || CLASS_META.unknown
              const isSelected = selectedDetectionId === det.detection_id

              return (
                <g
                  key={det.detection_id}
                  className={`bbox-group ${isSelected ? 'bbox-group--selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectDetection(det.detection_id)
                  }}
                  onMouseMove={(e) => handleMouseMove(e, det)}
                  onMouseLeave={handleMouseLeave}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Bounding Rectangle */}
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={isSelected ? `${meta.color}33` : `${meta.color}15`}
                    stroke={meta.color}
                    strokeWidth={isSelected ? 4 : 2}
                    vectorEffect="non-scaling-stroke"
                    rx={3}
                  />

                  {/* Corner Accent Highlights */}
                  {isSelected && (
                    <>
                      <circle cx={x} cy={y} r={4} fill={meta.color} />
                      <circle cx={x + width} cy={y} r={4} fill={meta.color} />
                      <circle cx={x} cy={y + height} r={4} fill={meta.color} />
                      <circle cx={x + width} cy={y + height} r={4} fill={meta.color} />
                    </>
                  )}

                  {/* Class & Confidence Badge Label */}
                  {(showLabels || showConfidence) && (
                    <g transform={`translate(${x}, ${Math.max(15, y - 6)})`}>
                      <rect
                        x="0"
                        y="-14"
                        width={
                          (showLabels ? meta.label.length * 7.5 : 0) +
                          (showConfidence ? 45 : 0) +
                          12
                        }
                        height="18"
                        fill="#0a1523dd"
                        stroke={meta.color}
                        strokeWidth="1"
                        rx="3"
                      />
                      <text
                        x="6"
                        y="-2"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="600"
                        fontFamily="sans-serif"
                      >
                        {showLabels ? meta.label : ''}
                        {showLabels && showConfidence ? ' ' : ''}
                        {showConfidence ? `${(det.confidence * 100).toFixed(0)}%` : ''}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Floating Tooltip */}
        {hoveredDetection && (
          <div
            className="viewer-tooltip"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
            }}
          >
            <div className="tooltip-header">
              <span
                className="tooltip-dot"
                style={{
                  backgroundColor: CLASS_META[hoveredDetection.class_name]?.color || '#8b949e',
                }}
              />
              <strong>{CLASS_META[hoveredDetection.class_name]?.label || hoveredDetection.class_name}</strong>
            </div>
            <div className="tooltip-row">
              <span>ID:</span>
              <span>{hoveredDetection.detection_id}</span>
            </div>
            <div className="tooltip-row">
              <span>Confidence:</span>
              <span>{(hoveredDetection.confidence * 100).toFixed(1)}%</span>
            </div>
            {hoveredDetection.geotag && (
              <>
                <div className="tooltip-row">
                  <span>Coordinates:</span>
                  <span>
                    {hoveredDetection.geotag.latitude?.toFixed(4)}&deg;N,{' '}
                    {hoveredDetection.geotag.longitude?.toFixed(4)}&deg;W
                  </span>
                </div>
                <div className="tooltip-row">
                  <span>Depth:</span>
                  <span>{hoveredDetection.geotag.depth_meters?.toFixed(1)} m</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
