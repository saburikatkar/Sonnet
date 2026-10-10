import React from 'react'

export default function DetectionFilters({
  minConfidence = 0.2,
  onConfidenceChange,
  selectedClasses = [],
  onToggleClass,
  classCounts = {},
}) {
  const availableClasses = [
    { key: 'shipwreck', label: 'Shipwreck' },
    { key: 'crab_pot', label: 'Crab Pot / Trap' },
    { key: 'ghost_net', label: 'Ghost Net' },
    { key: 'mine_cylinder', label: 'Mine / Cylinder' },
    { key: 'pipeline', label: 'Subsea Pipeline' },
  ]

  return (
    <div className="sb-controls">
      {/* Confidence threshold slider */}
      <div className="sb-row sb-row--col">
        <div className="sb-row sb-row--between">
          <label className="sb-label">Min Confidence</label>
          <span className="sb-value sb-value--mono">{Math.round(minConfidence * 100)}%</span>
        </div>
        <input
          type="range"
          className="sb-slider"
          min="10"
          max="85"
          step="5"
          value={Math.round(minConfidence * 100)}
          onChange={e => onConfidenceChange?.(+e.target.value / 100)}
        />
      </div>

      {/* Class toggles */}
      <div className="sb-class-filters">
        <span className="sb-sub-label">FILTER BY CLASS</span>
        {availableClasses.map(({ key, label }) => {
          const isChecked = selectedClasses.length === 0 || selectedClasses.includes(key)
          const count = classCounts[key] || 0
          return (
            <label key={key} className="sb-class-checkbox">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggleClass?.(key)}
              />
              <span className="sb-class-name">{label}</span>
              <span className={`sb-class-count ${count > 0 ? 'sb-class-count--active' : ''}`}>
                {count}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
