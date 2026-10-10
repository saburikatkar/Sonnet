import React from 'react'

export default function ProcessingStatus({ stageMessage, onCancel }) {
  return (
    <div className="processing-card" aria-live="polite" aria-busy="true" role="status">
      <div className="processing-card__spinner-box">
        <div className="spinner" />
      </div>
      <div className="processing-card__body">
        <h3 className="processing-card__title">Detection Pipeline In Progress</h3>
        <p className="processing-card__stage">{stageMessage || 'Initializing scan pipeline...'}</p>
        <div className="progress-bar-container">
          <div className="progress-bar-animated" />
        </div>
      </div>
      <div className="processing-card__actions">
        <button type="button" className="btn btn--danger btn--sm" onClick={onCancel}>
          Cancel Operation
        </button>
      </div>
    </div>
  )
}
