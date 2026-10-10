import React from 'react'

export default function ErrorBanner({ error, onRetry, onDismiss }) {
  if (!error) return null

  return (
    <div className="error-banner">
      <div className="error-banner__header">
        <span className="error-banner__icon">⛔</span>
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
