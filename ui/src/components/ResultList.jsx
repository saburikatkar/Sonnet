import React, { useState } from 'react'
import { CLASS_META, CLASS_TAXONOMY } from '../constants'

export default function ResultList({
  detections = [],
  selectedDetectionId,
  onSelectDetection,
  confidenceThreshold,
}) {
  const [filterClass, setFilterClass] = useState('ALL')
  const [sortBy, setSortBy] = useState('confidence_desc')
  const [searchQuery, setSearchQuery] = useState('')

  // 1. Filter by threshold
  let filtered = detections.filter((d) => d.confidence >= confidenceThreshold)

  // 2. Filter by class taxonomy
  if (filterClass !== 'ALL') {
    filtered = filtered.filter((d) => d.class_name === filterClass)
  }

  // 3. Search query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(
      (d) =>
        d.detection_id.toLowerCase().includes(q) ||
        d.class_name.toLowerCase().includes(q)
    )
  }

  // 4. Sort (use spread to avoid mutating the filtered array in-place)
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'confidence_desc') return b.confidence - a.confidence
    if (sortBy === 'confidence_asc') return a.confidence - b.confidence
    if (sortBy === 'depth_desc') return (b.geotag?.depth_meters || 0) - (a.geotag?.depth_meters || 0)
    if (sortBy === 'class') return a.class_name.localeCompare(b.class_name)
    return 0
  })

  return (
    <div className="results-panel">
      <div className="results-panel__header">
        <div className="results-panel__title-box">
          <h3 className="results-panel__title">Detections ({filtered.length})</h3>
          <span className="results-panel__badge">
            {detections.length} total &bull; {detections.length - filtered.length} filtered
          </span>
        </div>

        {/* Filter & Sort Controls */}
        <div className="results-controls">
          <input
            type="text"
            placeholder="Search ID / Class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-search"
          />

          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="select-dropdown"
          >
            <option value="ALL">All Categories</option>
            {CLASS_TAXONOMY.map((cls) => (
              <option key={cls} value={cls}>
                {CLASS_META[cls]?.label || cls}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="select-dropdown"
          >
            <option value="confidence_desc">Confidence: High to Low</option>
            <option value="confidence_asc">Confidence: Low to High</option>
            <option value="depth_desc">Depth: Deepest First</option>
            <option value="class">Class Name</option>
          </select>
        </div>
      </div>

      {/* Item List / Cards */}
      <div className="results-list-container">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p className="empty-state__text">No detections match current filter or threshold.</p>
          </div>
        ) : (
          <div className="detection-cards">
            {filtered.map((item) => {
              const meta = CLASS_META[item.class_name] || CLASS_META.unknown
              const isSelected = selectedDetectionId === item.detection_id

              return (
                <div
                  key={item.detection_id}
                  className={`detection-card ${isSelected ? 'detection-card--selected' : ''}`}
                  onClick={() => onSelectDetection(item.detection_id)}
                >
                  <div className="detection-card__header">
                    <div className="detection-card__label-group">
                      <span
                        className="class-indicator-dot"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span className="detection-card__class-name">{meta.label}</span>
                    </div>
                    <span className="detection-card__id">{item.detection_id}</span>
                  </div>

                  {/* Confidence meter */}
                  <div className="confidence-meter">
                    <div className="confidence-meter__label">
                      <span>Confidence</span>
                      <strong>{(item.confidence * 100).toFixed(1)}%</strong>
                    </div>
                    <div className="confidence-meter__track">
                      <div
                        className="confidence-meter__fill"
                        style={{
                          width: `${item.confidence * 100}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Geotag summary */}
                  {item.geotag && (
                    <div className="detection-card__geo">
                      <span className="geo-coord">
                        POS: {item.geotag.latitude?.toFixed(4)}&deg;, {item.geotag.longitude?.toFixed(4)}&deg;
                      </span>
                      <span className="geo-depth">
                        DEPTH: {item.geotag.depth_meters?.toFixed(1)}m
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
