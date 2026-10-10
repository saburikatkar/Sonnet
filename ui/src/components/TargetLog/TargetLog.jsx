import React, { useState } from 'react'
import { STATUS_OPTIONS } from '../../mock/mockData'
import './TargetLog.css'

export default function TargetLog({
  targets = [],
  selectedTargetId,
  onSelectTarget,
  collapsed,
  onToggleCollapse,
}) {
  const [search, setSearch] = useState('')

  const filtered = targets.filter(t =>
    !search ||
    t.id.toLowerCase().includes(search.toLowerCase()) ||
    t.class.toLowerCase().includes(search.toLowerCase()) ||
    t.type?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={`target-log ${collapsed ? 'target-log--collapsed' : ''}`}>
      {/* Header Bar */}
      <div className="tl-header">
        <div className="tl-header__left">
          <span className="tl-indicator" />
          <span className="tl-title">Target Log</span>
          <span className="tl-count">{targets.length} Target Events</span>
        </div>

        <div className="tl-header__right">
          <div className="tl-search">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#627b92" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="tl-search__input"
              placeholder="Search targets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <button type="button" className="tl-icon-btn" title="Filter list">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
          <button type="button" className="tl-icon-btn" title="Starred">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
          <button type="button" className="tl-collapse-btn" onClick={onToggleCollapse} title={collapsed ? 'Expand' : 'Collapse'}>
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
                <th>TYPE</th>
                <th>CLASS</th>
                <th>MODEL SCORE</th>
                <th>ROI</th>
                <th>TIME (S)</th>
                <th>FRAME</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const isSelected = selectedTargetId === t.id
                return (
                  <tr
                    key={t.id}
                    className={`tl-row ${isSelected ? 'tl-row--selected' : ''}`}
                    onClick={() => onSelectTarget?.(t.id)}
                  >
                    <td className="tl-cell tl-cell--id">{t.id}</td>
                    <td className="tl-cell">
                      {/* Realistic Amber Sonar Crop Thumbnail with Yellow Bbox */}
                      <div className="tl-thumb-wrap">
                        <svg className="tl-thumb-svg" viewBox="0 0 40 28">
                          <defs>
                            <linearGradient id={`thumbGrad-${t.id}`} x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#1e0b04" />
                              <stop offset="50%" stopColor="#8a3c10" />
                              <stop offset="100%" stopColor="#e08420" />
                            </linearGradient>
                          </defs>
                          <rect width="40" height="28" fill={`url(#thumbGrad-${t.id})`} rx="2" />
                          {/* Acoustic object shadow */}
                          <rect x="8" y="7" width="10" height="14" fill="#0c0502" opacity="0.8" rx="1" />
                          {/* Acoustic object highlight */}
                          <rect x="18" y="7" width="12" height="14" fill="#f8b050" opacity="0.9" rx="1" />
                          {/* Yellow Bounding Box */}
                          <rect x="16" y="5" width="16" height="18" fill="none" stroke="#f5c400" strokeWidth="1.2" rx="1" />
                        </svg>
                      </div>
                    </td>
                    <td className="tl-cell">
                      <span className="tl-class">{t.class}</span>
                      <span className="tl-type-sub">{t.type}</span>
                    </td>
                    <td className="tl-cell tl-cell--score">
                      <span className={`tl-score ${t.modelScore >= 0.75 ? 'tl-score--high' : t.modelScore >= 0.5 ? 'tl-score--mid' : 'tl-score--low'}`}>
                        {Number(t.modelScore).toFixed(3)}
                      </span>
                    </td>
                    <td className="tl-cell tl-cell--roi">{t.roi}</td>
                    <td className="tl-cell tl-cell--mono">{t.timeS}</td>
                    <td className="tl-cell tl-cell--mono">{t.frame}</td>
                    <td className="tl-cell">
                      <StatusDropdown targetId={t.id} status={t.status} />
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" className="tl-empty">No target events match the filter</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusDropdown({ targetId, status }) {
  const [val, setVal] = useState(status)
  return (
    <div className="tl-status-wrap" onClick={e => e.stopPropagation()}>
      <select
        className={`tl-status-select tl-status--${val.replace(/\s+/g, '-').toLowerCase()}`}
        value={val}
        onChange={e => {
          e.stopPropagation()
          setVal(e.target.value)
        }}
      >
        {STATUS_OPTIONS.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  )
}
