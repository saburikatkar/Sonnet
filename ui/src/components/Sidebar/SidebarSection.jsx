import React, { useState } from 'react'

export default function SidebarSection({ label, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="sb-section">
      <button className="sb-section__header" onClick={() => setOpen(o => !o)} type="button">
        <span className="sb-section__label">{label}</span>
        <span className="sb-section__arrow">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="sb-section__body">{children}</div>}
    </div>
  )
}
