import React, { useState } from 'react'
import { STATUS_OPTIONS } from '../../mock/mockData'
import './TargetLog.css'

// TODO: replace mock thumbnail colours with real sonar image crops from backend

export default function TargetLog({ targets = [], selectedTargetId, onSelectTarget, collapsed, onToggleCollapse }) {
  const [search, setSearch] = useState('')

  const filtered = targets.filter(t =>
    !search || t.id.toLowerCase().includes(search.toLowerCase()) ||
    t.class.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={`target-log ${collapsed ? 'target-log--collapsed' : ''}`}>
      {/* Header */}
      <div className="tl-header">
        <div className="tl-header__left">
          <button type="button" className="tl-collapse-btn" onClick={onToggleCollapse}>
            {collapsed ? '▲' : '▼'}
          </button>
          <span className="tl-title">Target Log</span>
          <span className="tl-count">{targets.length} Target Events</span>
        </div>
        {!collapsed && (
          <div className="tl-header__right">
            <div className="tl-search">
              <span className="tl-search__icon">🔍</span>
              <input
                type="text"
                className="tl-search__input"
                placeholder="Search targets…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button type="button" className="tl-icon-btn" title="Star selected">☆</button>
            <button type="button" className="tl-icon-btn" title="Delete selected">🗑</button>
            <button type="button" className="tl-icon-btn" title="Download CSV">⬇</button>
          </div>
        )}
      </div>

      {/* Table */}
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
                <th>TIME (s)</th>
                <th>FRAME</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr
                  key={t.id}
                  className={`tl-row ${selectedTargetId === t.id ? 'tl-row--selected' : ''}`}
                  onClick={() => onSelectTarget(t.id)}
                >
                  <td className="tl-cell tl-cell--id">{t.id}</td>
                  <td className="tl-cell">
                    {/* TODO: replace with real sonar thumbnail from backend */}
                    <div className="tl-thumb" style={{ background: thumbColor(t) }} aria-label="Sonar thumbnail" />
                  </td>
                  <td className="tl-cell">
                    <span className="tl-class">{t.class}</span>
                    <span className="tl-type-sub">{t.type}</span>
                  </td>
                  <td className="tl-cell tl-cell--score">
                    <span className={`tl-score ${t.modelScore >= 0.7 ? 'tl-score--high' : t.modelScore >= 0.4 ? 'tl-score--mid' : 'tl-score--low'}`}>
                      {t.modelScore.toFixed(3)}
                    </span>
                  </td>
                  <td className="tl-cell tl-cell--roi">{t.roi}</td>
                  <td className="tl-cell tl-cell--mono">{t.timeS}</td>
                  <td className="tl-cell tl-cell--mono">{t.frame}</td>
                  <td className="tl-cell">
                    <StatusDropdown targetId={t.id} status={t.status} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" className="tl-empty">No targets match search</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function thumbColor(t) {
  const colors = {
    port:       'linear-gradient(135deg,#3a1a08,#8a4020)',
    starboard:  'linear-gradient(135deg,#1a2a3a,#2a5080)',
  }
  return colors[t.side] || colors.port
}

function StatusDropdown({ targetId, status }) {
  const [val, setVal] = useState(status)
  return (
    <select
      className={`tl-status-select tl-status--${val.replace(/\s+/g, '-').toLowerCase()}`}
      value={val}
      onChange={e => { e.stopPropagation(); setVal(e.target.value) }}
      onClick={e => e.stopPropagation()}
    >
      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  )
}
