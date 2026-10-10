import React from 'react'
import './SurveyPlan.css'

export default function SurveyPlan({ plan = {} }) {
  const {
    totalLines = 5,
    spacing = 50,
    totalKm = 3.2,
    currentLine = 2,
    distToEnd = 420,
    estTime = '00:18:36',
  } = plan

  return (
    <div className="survey-plan">
      <div className="survey-plan__header">
        <span className="survey-plan__title">SURVEY PLAN</span>
      </div>

      <div className="survey-plan__body">
        {/* Key metrics box */}
        <div className="sp-metrics">
          <div className="sp-metric">
            <span className="sp-metric__lbl">Lines</span>
            <span className="sp-metric__val">{totalLines}</span>
          </div>
          <div className="sp-metric-sep" />
          <div className="sp-metric">
            <span className="sp-metric__lbl">Spacing</span>
            <span className="sp-metric__val">{spacing} m</span>
          </div>
          <div className="sp-metric-sep" />
          <div className="sp-metric">
            <span className="sp-metric__lbl">Length</span>
            <span className="sp-metric__val">{totalKm} km</span>
          </div>
        </div>

        {/* Status rows */}
        <div className="sp-rows">
          <div className="sp-row">
            <span className="sp-row__label">Current Line:</span>
            <span className="sp-row__value">
              {currentLine} / {totalLines} <span className="sp-active-pill">(Active)</span>
            </span>
          </div>
          <div className="sp-row">
            <span className="sp-row__label">Distance to End:</span>
            <span className="sp-row__value">{distToEnd} m</span>
          </div>
          <div className="sp-row">
            <span className="sp-row__label">Est. Time:</span>
            <span className="sp-row__value sp-row__value--mono">{estTime}</span>
          </div>
        </div>

        {/* Progress track */}
        <div className="sp-progress-track">
          <div
            className="sp-progress-fill"
            style={{ width: `${(currentLine / totalLines) * 100}%` }}
          />
        </div>

        {/* + Add Map Layer button */}
        <button type="button" className="sp-add-layer-btn">
          + Add Map Layer
        </button>
      </div>
    </div>
  )
}
