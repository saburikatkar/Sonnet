import React from 'react';
import './AnalyticsPanel.css';

export default function AnalyticsPanel({ detections = [] }) {
  // Compute summary
  const summaryMap = detections.reduce((acc, det) => {
    const className = det.class_name || 'unknown';
    // Format name to title case
    const formattedName = className.charAt(0).toUpperCase() + className.slice(1);
    acc[formattedName] = (acc[formattedName] || 0) + 1;
    return acc;
  }, {});

  const summaryText = Object.entries(summaryMap)
    .map(([name, count]) => `${count} ${name}${count !== 1 ? 's' : ''}`)
    .join(', ') || 'No objects found';

  // Compute average confidence
  const avgConfidence = detections.length
    ? detections.reduce((sum, det) => sum + (det.confidence || 0), 0) / detections.length
    : 0;
  
  const confidencePercent = (avgConfidence * 100).toFixed(1);

  return (
    <div className="analytics-panel">
      <div className="analytics-panel__header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00c2e0" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        <h3 className="analytics-title">AI ANALYTICS</h3>
      </div>
      
      <div className="analytics-panel__body">
        <div className="analytics-row">
          <span className="analytics-label">Total Detections:</span>
          <span className="analytics-value">{detections.length}</span>
        </div>
        
        <div className="analytics-row">
          <span className="analytics-label">Summary:</span>
          <span className="analytics-value analytics-summary">{summaryText}</span>
        </div>

        <div className="analytics-confidence-section">
          <div className="confidence-header">
            <span className="analytics-label">Avg Confidence</span>
            <span className="confidence-percent">{confidencePercent}%</span>
          </div>
          <div className="confidence-bar-bg">
            <div 
              className="confidence-bar-fill" 
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
