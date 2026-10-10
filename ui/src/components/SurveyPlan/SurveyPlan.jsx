import React from 'react'
import './SurveyPlan.css'

// TODO: replace with live survey plan data from backend
export default function SurveyPlan({ plan = {} }) {
  const {
    totalLines = 6, spacing = 50, totalKm = 3.2,
    currentLine = 2, distToEnd = 428, estTime = '--:--:--',
  } = plan

  return (
    <div className="survey-plan">
      <div className="survey-plan__header">
        <span className="survey-plan__title">SURVEY PLAN</span>
        <button type="button" className="sp-icon-btn" title="Expand">+</button>
      </div>

      <div className="survey-plan__body">
        {/* Key metrics row */}
        <div className="sp-metrics">
          <div className="sp-metric">
            <span className="sp-metric__val">{totalLines}</span>
            <span className="sp-metric__lbl">Lines</span>
          </div>
          <div className="sp-metric-sep" />
          <div className="sp-metric">
            <span className="sp-metric__val">{spacing}m</span>
            <span className="sp-metric__lbl">Spacing</span>
          </div>
          <div className="sp-metric-sep" />
          <div className="sp-metric">
            <span className="sp-metric__val">{totalKm}km</span>
            <span className="sp-metric__lbl">Length</span>
          </div>
        </div>

        {/* Status rows */}
        <div className="sp-rows">
          <div className="sp-row">
            <span className="sp-row__label">Current Line</span>
            <span className="sp-row__value">
              {currentLine} / {totalLines}
              <span className="sp-active-tag">active</span>
            </span>
          </div>
          <div className="sp-row">
            <span className="sp-row__label">Distance to End</span>
            <span className="sp-row__value">{distToEnd} m</span>
          </div>
          <div className="sp-row">
            <span className="sp-row__label">Est. Time</span>
            <span className="sp-row__value sp-row__value--mono">{estTime}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="sp-progress-track">
          <div
            className="sp-progress-fill"
            style={{ width: `${(currentLine / totalLines) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
