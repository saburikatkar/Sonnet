import React from 'react'
import { COLOR_MAPS } from '../../mock/mockData'

export default function DisplayControls({ settings, onChange }) {
  return (
    <div className="sb-controls">
      {/* Color Map */}
      <div className="sb-row sb-row--col">
        <label className="sb-label">Color Map</label>
        <div className="sb-colormap-row">
          <div className="sb-colormap-swatch" aria-hidden="true" />
          <select
            className="sb-select"
            value={settings.colorMap}
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
          <span className="sb-value">{settings.brightness}</span>
        </div>
        <input type="range" className="sb-slider" min="0" max="100"
          value={settings.brightness} onChange={e => onChange({ brightness: +e.target.value })} />
      </div>

      {/* Contrast */}
      <div className="sb-row sb-row--col">
        <div className="sb-row sb-row--between">
          <label className="sb-label">Contrast</label>
          <span className="sb-value">{settings.contrast}</span>
        </div>
        <input type="range" className="sb-slider" min="0" max="100"
          value={settings.contrast} onChange={e => onChange({ contrast: +e.target.value })} />
      </div>

      {/* Gamma */}
      <div className="sb-row sb-row--col">
        <div className="sb-row sb-row--between">
          <label className="sb-label">Gamma</label>
          <span className="sb-value">{settings.gamma.toFixed(1)}</span>
        </div>
        <input type="range" className="sb-slider" min="1" max="30" step="1"
          value={Math.round(settings.gamma * 10)}
          onChange={e => onChange({ gamma: +e.target.value / 10 })} />
      </div>

      {/* Checkboxes */}
      {[
        ['slantRangeCorrection', 'Slant Range Correction'],
        ['rangeLines',           'Range Lines'],
        ['autoGain',             'Auto Gain (TVG)'],
      ].map(([key, label]) => (
        <label key={key} className="sb-checkbox">
          <input type="checkbox" checked={settings[key]}
            onChange={e => onChange({ [key]: e.target.checked })} />
          <span className="sb-checkbox__label">{label}</span>
        </label>
      ))}
    </div>
  )
}
