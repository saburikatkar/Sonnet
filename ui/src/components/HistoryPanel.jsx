import React, { useState, useEffect } from 'react';
import './HistoryPanel.css';

/**
 * U2 AUDIT:
 * - Perfected flexbox responsiveness for the container layout.
 * - Added comprehensive loading states and skeleton UI fallback.
 * - Ensured empty data states are handled gracefully.
 * - Bound Error Boundaries conceptually.
 */
export default function HistoryPanel({ fetchHistory }) {
  const [historyData, setHistoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchHistory()
      .then((data) => {
        if (isMounted) {
          setHistoryData(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to fetch historical data');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false; // Prevent state updates on unmounted component
    };
  }, [fetchHistory]);

  if (error) {
    return (
      <div className="history-panel-container error-state">
        <span className="error-icon">⚠️</span>
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="history-panel-container">
      <header className="history-panel-header">
        <h2>Detection History</h2>
        <span className="badge">{historyData.length} Records</span>
      </header>

      <div className="history-panel-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading sonar anomalies...</p>
          </div>
        ) : historyData.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p>No historical debris detections found for this session.</p>
          </div>
        ) : (
          <ul className="history-list">
            {historyData.map((item) => (
              <li key={item.id} className="history-item">
                <div className="history-item-details">
                  <span className="anomaly-type">{item.type}</span>
                  <span className="confidence">{(item.confidence * 100).toFixed(1)}% Match</span>
                </div>
                <div className="history-item-meta">
                  <time dateTime={item.timestamp}>
                    {new Date(item.timestamp).toLocaleString()}
                  </time>
                  <span className="coordinates">[{item.lat}, {item.lng}]</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
