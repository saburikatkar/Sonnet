import React, { useState } from 'react'
import SidebarSection from './SidebarSection'
import DisplayControls from './DisplayControls'
import GainControls from './GainControls'
import NavigationPanel from './NavigationPanel'
import './Sidebar.css'

export default function Sidebar({
  collapsed, onToggleCollapse,
  displaySettings, onDisplayChange,
  gainSettings, onGainChange,
  navData, dgpsFix,
}) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <button className="sidebar__collapse-btn" onClick={onToggleCollapse} title={collapsed ? 'Expand' : 'Collapse'}>
        {collapsed ? '›' : '‹'}
      </button>
      {!collapsed && (
        <>
          <SidebarSection label="DISPLAY" defaultOpen>
            <DisplayControls settings={displaySettings} onChange={onDisplayChange} />
          </SidebarSection>
          <SidebarSection label="GAIN & PROCESSING">
            <GainControls settings={gainSettings} onChange={onGainChange} />
          </SidebarSection>
          <SidebarSection label="NAVIGATION" defaultOpen>
            <NavigationPanel navData={navData} dgpsFix={dgpsFix} />
          </SidebarSection>
        </>
      )}
    </aside>
  )
}
