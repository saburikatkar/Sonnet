import React, { useState } from 'react'
import { STATUS_OPTIONS } from '../../mock/mockData'
import './TargetLog.css'

export default function TargetLog({
  targets = [],
  selectedTargetId,
  onSelectTarget,
  onUpdateTargetStatus,
  collapsed,
  onToggleCollapse,
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [channelFilter, setChannelFilter] = useState('ALL')

  const filtered = targets.filter(t => {
    // 1. Search filter
    const matchesSearch = !search ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.class?.toLowerCase().includes(search.toLowerCase()) ||
      t.type?.toLowerCase().includes(search.toLowerCase())

    // 2. Status filter
    const matchesStatus = statusFilter === 'ALL' ||
      (statusFilter === 'CONFIRMED' && (t.status === 'Operator accepted' || t.status === 'Confirmed')) ||
      (statusFilter === 'DETECTED' && t.status === 'Detected') ||
      (statusFilter === 'REVIEW' && t.status === 'Pending Review') ||
      (statusFilter === 'FALSE_POSITIVE' && t.status === 'False Positive')

    // 3. Channel filter
    const ch = (t.roi || t.side || (t.bbox?.x < 0.5 ? 'port' : 'starboard')).toLowerCase()
    const matchesChannel = channelFilter === 'ALL' || ch === channelFilter.toLowerCase()

    return matchesSearch && matchesStatus && matchesChannel
  })

  return (
    <div className={`target-log ${collapsed ? 'target-log--collapsed' : ''}`}>
      {/* Header Bar */}
      <div className="tl-header">
        <div className="tl-header__left">
          <span className="tl-indicator" />
          <span className="tl-title">TARGET DETECTION LOG</span>
          <span className="tl-count">{filtered.length} of {targets.length} Anomaly Events</span>
        </div>

        <div className="tl-header__right">
          {/* Quick Status Filter Pills */}
          <div className="tl-filter-pills">
            {['ALL', 'CONFIRMED', 'DETECTED', 'REVIEW'].map(s => (
              <button
                key={s}
                type="button"
                className={`tl-pill-btn ${statusFilter === s ? 'tl-pill-btn--active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="tl-search">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#627b92" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="tl-search__input"
              placeholder="Search ID, class..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="tl-clear-btn" onClick={() => setSearch('')}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <button
            type="button"
            className="tl-collapse-btn"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand Log' : 'Collapse Log'}
          >
            {collapsed ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Table Body */}
      {!collapsed && (
        <div className="tl-body">
          <table className="tl-table">
            <thead>
              <tr>
                <th>TRACK ID</th>
                <th>ACOUSTIC RETURN</th>
                <th>CLASSIFICATION</th>
                <th>YOLO CONFIDENCE</th>
                <th>CHANNEL</th>
                <th>TIMESTAMP</th>
                <th>FRAME</th>
                <th>VERIFICATION STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const isSelected = selectedTargetId === t.id
                const score = Number(t.confidence ?? t.modelScore ?? 0.85)
                const channel = (t.roi || t.side || (t.bbox?.x < 0.5 ? 'port' : 'starboard')).toUpperCase()

                return (
                  <tr
                    key={t.id}
                    className={`tl-row ${isSelected ? 'tl-row--selected' : ''}`}
                    onClick={() => onSelectTarget?.(t.id)}
                  >
                    <td className="tl-cell tl-cell--id">{t.id}</td>
                    <td className="tl-cell">
                      {/* Authentic Sonar Crop Thumbnail with HUD Reticle */}
                      <div className={`tl-thumb-wrap ${isSelected ? 'tl-thumb-wrap--selected' : ''}`}>
                        <img
                          src={t.thumbnailUrl || '/assets/sonar_shipwreck_scan.jpg'}
                          alt={t.id}
                          className="tl-thumb-img"
                          loading="lazy"
                        />
                        <div className="tl-thumb-reticle" />
                      </div>
                    </td>
                    <td className="tl-cell">
                      <span className="tl-class">{t.class || t.type?.toUpperCase()}</span>
                      <span className="tl-type-sub">{t.type?.replace('_', ' ')}</span>
                    </td>
                    <td className="tl-cell tl-cell--score">
                      <span className={`tl-score ${score >= 0.6 ? 'tl-score--high' : score >= 0.4 ? 'tl-score--mid' : 'tl-score--low'}`}>
                        {(score * 100).toFixed(1)}% ({score.toFixed(3)})
                      </span>
                    </td>
                    <td className="tl-cell tl-cell--roi">{channel} CH</td>
                    <td className="tl-cell tl-cell--mono">{t.timeS || '00:14.2'}</td>
                    <td className="tl-cell tl-cell--mono">{t.frame || 'F-0428'}</td>
                    <td className="tl-cell">
                      <select
                        className={`tl-status-select tl-status--${t.status?.replace(/\s+/g, '-').toLowerCase()}`}
                        value={t.status || 'Detected'}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          e.stopPropagation()
                          onUpdateTargetStatus?.(t.id, e.target.value)
                        }}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" className="tl-empty">
                    {targets.length === 0
                      ? 'No sonar anomalies detected. Click "RUN DETECTION" to process a file.'
                      : 'No target detections match the active filter criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
