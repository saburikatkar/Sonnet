import React from 'react'

const TOGGLES = ['AGC', 'BAC', 'EGN', 'TVG', 'UGC']

export default function GainControls({ settings, onChange }) {
  return (
    <div className="sb-controls">
      {/* Toggle pill buttons */}
      <div className="sb-toggle-row">
        {TOGGLES.map(key => (
          <button
            key={key}
            type="button"
            className={`sb-toggle ${settings[key.toLowerCase()] ? 'sb-toggle--on' : ''}`}
            onClick={() => onChange({ [key.toLowerCase()]: !settings[key.toLowerCase()] })}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Enable EGN checkbox */}
      <label className="sb-checkbox">
        <input type="checkbox" checked={settings.enableEgn}
          onChange={e => onChange({ enableEgn: e.target.checked })} />
        <span className="sb-checkbox__label">Enable EGN</span>
        <button type="button" className="sb-mini-btn">Rebuild...</button>
      </label>

      {/* Nadir Angle */}
      <div className="sb-row sb-row--col">
        <div className="sb-row sb-row--between">
          <label className="sb-label">Nadir Angle</label>
          <span className="sb-value">{settings.nadirAngle}°</span>
        </div>
        <input type="range" className="sb-slider" min="0" max="45"
          value={settings.nadirAngle} onChange={e => onChange({ nadirAngle: +e.target.value })} />
      </div>

      {/* Despeckle Filter */}
      <div className="sb-row sb-row--col">
        <div className="sb-row sb-row--between">
          <label className="sb-label">Despeckle Filter</label>
          <span className="sb-value">{settings.despeckleFilter}</span>
        </div>
        <input type="range" className="sb-slider" min="0" max="100"
          value={settings.despeckleFilter} onChange={e => onChange({ despeckleFilter: +e.target.value })} />
      </div>

      {/* User Gain */}
      <div className="sb-row sb-row--col">
        <div className="sb-row sb-row--between">
          <label className="sb-label">User Gain</label>
          <span className="sb-value">{settings.userGain > 0 ? '+' : ''}{settings.userGain} dB</span>
        </div>
        <input type="range" className="sb-slider" min="-24" max="24"
          value={settings.userGain} onChange={e => onChange({ userGain: +e.target.value })} />
      </div>
    </div>
  )
}
