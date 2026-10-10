import React from 'react'

export default function ErrorBanner({ error, onRetry, onDismiss }) {
  if (!error) return null

  return (
    <div className="error-banner">
      <div className="error-banner__header">
        <svg className="error-banner__icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="error-banner__titles">
          <h4 className="error-banner__code">{error.code || 'API_ERROR'}</h4>
          <p className="error-banner__message">{error.message}</p>
        </div>
      </div>

      {error.details && Object.keys(error.details).length > 0 && (
        <pre className="error-banner__details">
          {JSON.stringify(error.details, null, 2)}
        </pre>
      )}

      <div className="error-banner__actions">
        {onRetry && (
          <button type="button" className="btn btn--primary btn--sm" onClick={onRetry}>
            Retry Request
          </button>
        )}
        {onDismiss && (
          <button type="button" className="btn btn--secondary btn--sm" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}
