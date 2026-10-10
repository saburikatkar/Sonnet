import React from 'react'

const TOGGLES = ['AGC', 'BAC', 'EGN', 'TVG', 'UGC']

export default function GainControls({ settings, onChange }) {
  const activeToggle = settings.activeGainMode || 'EGN'

  return (
    <div className="sb-controls">
      {/* Toggle pill buttons */}
      <div className="sb-toggle-row">
        {TOGGLES.map(key => {
          const isSelected = activeToggle === key || settings[key.toLowerCase()]
          return (
            <button
              key={key}
              type="button"
              className={`sb-toggle ${isSelected ? 'sb-toggle--on' : ''}`}
              onClick={() => {
                onChange({
                  activeGainMode: key,
                  [key.toLowerCase()]: true,
                  ...TOGGLES.filter(k => k !== key).reduce((acc, k) => ({ ...acc, [k.toLowerCase()]: false }), {})
                })
              }}
            >
              {key}
            </button>
          )
        })}
      </div>

      {/* Enable EGN checkbox */}
      <div className="sb-egn-row">
        <label className="sb-checkbox">
          <input
            type="checkbox"
            checked={settings.enableEgn ?? true}
            onChange={e => onChange({ enableEgn: e.target.checked })}
          />
          <span className="sb-checkbox__label">Enable EGN</span>
        </label>
        <button type="button" className="sb-mini-btn">Rebuild...</button>
      </div>

      {/* Nadir Angle */}
      <div className="sb-row sb-row--col">
        <div className="sb-row sb-row--between">
          <label className="sb-label">Nadir Angle</label>
          <span className="sb-value">{settings.nadirAngle ?? 20}°</span>
        </div>
        <input
          type="range"
          className="sb-slider"
          min="0"
          max="45"
          value={settings.nadirAngle ?? 20}
          onChange={e => onChange({ nadirAngle: +e.target.value })}
        />
      </div>

      {/* Despeckle Filter */}
      <div className="sb-row sb-row--col">
        <div className="sb-row sb-row--between">
          <label className="sb-label">Despeckle Filter</label>
          <span className="sb-value">{settings.despeckleFilter ?? 50}</span>
        </div>
        <input
          type="range"
          className="sb-slider"
          min="0"
          max="100"
          value={settings.despeckleFilter ?? 50}
          onChange={e => onChange({ despeckleFilter: +e.target.value })}
        />
      </div>

      {/* User Gain */}
      <div className="sb-row sb-row--col">
        <div className="sb-row sb-row--between">
          <label className="sb-label">User Gain</label>
          <span className="sb-value">{(settings.userGain ?? 0) > 0 ? '+' : ''}{settings.userGain ?? 0} dB</span>
        </div>
        <input
          type="range"
          className="sb-slider"
          min="-24"
          max="24"
          value={settings.userGain ?? 0}
          onChange={e => onChange({ userGain: +e.target.value })}
        />
      </div>
    </div>
  )
}
