import React from 'react'
import SidebarSection from './SidebarSection'
import DisplayControls from './DisplayControls'
import DetectionFilters from './DetectionFilters'
import NavigationPanel from './NavigationPanel'
import './Sidebar.css'

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  displaySettings,
  onDisplayChange,
  minConfidence,
  onConfidenceChange,
  selectedClasses,
  onToggleClass,
  classCounts,
  navData,
  dgpsFix,
}) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <button className="sidebar__collapse-btn" onClick={onToggleCollapse} title={collapsed ? 'Expand' : 'Collapse'}>
        {collapsed ? '›' : '‹'}
      </button>
      {!collapsed && (
        <>
          <SidebarSection label="IMAGE CONTROLS" defaultOpen>
            <DisplayControls settings={displaySettings} onChange={onDisplayChange} />
          </SidebarSection>

          <SidebarSection label="DETECTION FILTERS" defaultOpen>
            <DetectionFilters
              minConfidence={minConfidence}
              onConfidenceChange={onConfidenceChange}
              selectedClasses={selectedClasses}
              onToggleClass={onToggleClass}
              classCounts={classCounts}
            />
          </SidebarSection>

          <SidebarSection label="VESSEL TELEMETRY" defaultOpen badge={dgpsFix ? 'DGPS FIX' : 'ESTIMATED'}>
            <NavigationPanel navData={navData} dgpsFix={dgpsFix} />
          </SidebarSection>
        </>
      )}
    </aside>
  )
}
