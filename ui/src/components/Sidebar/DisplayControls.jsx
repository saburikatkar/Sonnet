import React from 'react'
import { COLOR_MAPS } from '../../mock/mockData'

export default function DisplayControls({ settings, onChange }) {
  return (
    <div className="sb-controls">
      {/* Color Map */}
      <div className="sb-row sb-row--col">
        <label className="sb-label">Color Map</label>
        <div className="sb-colormap-row">
          <select
            className="sb-select"
            value={settings.colorMap || 'MytisBronze'}
            onChange={e => onChange({ colorMap: e.target.value })}
          >
            {COLOR_MAPS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Brightness */}
      <div className="sb-row sb-row--col">
        <div className="sb-row sb-row--between">
          <label className="sb-label">Brightness</label>
          <span className="sb-value">{settings.brightness ?? 0}</span>
        </div>
        <input
          type="range"
          className="sb-slider"
          min="-80"
          max="80"
          value={settings.brightness ?? 0}
          onChange={e => onChange({ brightness: +e.target.value })}
        />
      </div>

      {/* Contrast */}
      <div className="sb-row sb-row--col">
        <div className="sb-row sb-row--between">
          <label className="sb-label">Contrast</label>
          <span className="sb-value">{settings.contrast ?? 0}</span>
        </div>
        <input
          type="range"
          className="sb-slider"
          min="-80"
          max="80"
          value={settings.contrast ?? 0}
          onChange={e => onChange({ contrast: +e.target.value })}
        />
      </div>

      {/* Reset to defaults button */}
      <button
        type="button"
        className="sb-reset-btn"
        onClick={() => onChange({ brightness: 0, contrast: 0, colorMap: 'MytisBronze' })}
      >
        Reset Display Defaults
      </button>
    </div>
  )
}
