import React, { useState } from 'react'

export default function SidebarSection({ label, defaultOpen = true, badge, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="sb-section">
      <button className="sb-section__header" onClick={() => setOpen(o => !o)} type="button">
        <span className="sb-section__label">{label}</span>
        {badge && <span className="sb-header-badge">{badge}</span>}
        <span className="sb-section__arrow">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="sb-section__body">{children}</div>}
    </div>
  )
}
