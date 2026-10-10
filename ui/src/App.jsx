import React, { useState, useEffect, useCallback } from 'react'
import TopBar        from './components/TopBar/TopBar'
import InfoStrip     from './components/InfoStrip/InfoStrip'
import Sidebar       from './components/Sidebar/Sidebar'
import SonarView     from './components/SonarView/SonarView'
import MiniMap       from './components/MiniMap/MiniMap'
import MapLayers     from './components/MapLayers/MapLayers'
import SurveyPlan    from './components/SurveyPlan/SurveyPlan'
import TargetLog     from './components/TargetLog/TargetLog'
import HistoryPanel  from './components/HistoryPanel'
import AnalyticsPanel from './components/AnalyticsPanel'
import ErrorBoundary from './components/ErrorBoundary'
import ErrorBanner   from './components/ErrorBanner'
import { checkHealth } from './api/client'
import { useWebSocket } from './hooks/useWebSocket'
import {
  MOCK_NAVIGATION, MOCK_TARGETS, MOCK_SURVEY_PLAN, MOCK_LAYERS,
} from './mock/mockData'

export default function App() {
  // ── Navigation / tabs ──────────────────────────────────────────
  const [activeTab,        setActiveTab]        = useState('LIVE')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [logCollapsed,     setLogCollapsed]     = useState(false)
  const [isHistoryOpen,    setIsHistoryOpen]    = useState(false)

  // ── Recording timer ────────────────────────────────────────────
  const [isRecording,    setIsRecording]    = useState(false)
  const [recordingTime,  setRecordingTime]  = useState(0)

  // ── Backend health ─────────────────────────────────────────────
  const [backendStatus, setBackendStatus] = useState('checking')
  const [apiError,      setApiError]      = useState(null)

  // ── Display / gain settings ────────────────────────────────────
  const [displaySettings, setDisplaySettings] = useState({
    colorMap: 'MultiBronze',
    brightness: 50,
    contrast: 50,
    gamma: 1.0,
    slantRangeCorrection: true,
    rangeLines: true,
    autoGain: false,
  })
  const [gainSettings, setGainSettings] = useState({
    agc: false, bac: false, egn: true, tvg: false, ugc: false,
    enableEgn: true,
    nadirAngle: 28,
    despeckleFilter: 58,
    userGain: 0,
  })

  // ── Navigation telemetry (WebSocket → live; else mock) ─────────
  // TODO: replace MOCK_NAVIGATION with live WebSocket data
  const [navData,  setNavData]  = useState(MOCK_NAVIGATION)
  const [dgpsFix,  setDgpsFix]  = useState(true)

  // ── Targets / detection results ────────────────────────────────
  // TODO: replace MOCK_TARGETS with live detection results from backend
  const [targets,           setTargets]           = useState(MOCK_TARGETS)
  const [selectedTargetId,  setSelectedTargetId]  = useState(null)
  const [activeJobId,       setActiveJobId]        = useState(null)

  // ── Survey & layers ────────────────────────────────────────────
  // TODO: replace with live backend data
  const [surveyPlan, setSurveyPlan] = useState(MOCK_SURVEY_PLAN)
  const [mapLayers,  setMapLayers]  = useState(MOCK_LAYERS)

  // ── WebSocket for active job telemetry ─────────────────────────
  useWebSocket(activeJobId, {
    onNav:   (nav) => { setNavData(nav); setDgpsFix(!!nav.dgpsFix) },
    onStage: (stage) => console.info('[Stage]', stage),
    onError: () => setBackendStatus('offline'),
  })

  // ── Backend health probe ───────────────────────────────────────
  useEffect(() => {
    let mounted = true
    async function probe() {
      try {
        const res = await checkHealth()
        if (mounted) setBackendStatus(res.status === 'ok' ? 'online' : 'degraded')
      } catch {
        if (mounted) setBackendStatus('offline')
      }
    }
    probe()
    const t = setInterval(probe, 20000)
    return () => { mounted = false; clearInterval(t) }
  }, [])

  // ── Recording timer ────────────────────────────────────────────
  useEffect(() => {
    if (!isRecording) return
    const t = setInterval(() => setRecordingTime(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [isRecording])

  // ── Handlers ───────────────────────────────────────────────────
  const handleAddTarget = useCallback((t) => setTargets(prev => [t, ...prev]), [])
  const handleHistoryJob = useCallback((jobData) => {
    if (!jobData) return
    setActiveJobId(jobData.job_id)
    if (jobData.detections?.length) {
      setTargets(jobData.detections.map((d, i) => ({
        id: d.detection_id || `TRK-${i}`,
        type: 'sonar',
        class: d.class_name || 'Sonar target',
        modelScore: d.confidence || 0,
        roi: d.geotag?.side || 'port',
        timeS: '--',
        frame: `F-${i}`,
        status: 'Detected',
        bbox: d.bbox || { x: 0.1, y: 0.1, w: 0.08, h: 0.18 },
        side: 'port',
        confidence: d.confidence || 0,
      })))
    }
    setIsHistoryOpen(false)
  }, [])

  const isConnected = backendStatus === 'online'

  return (
    <ErrorBoundary>
      <div className="tarang-shell">
        {/* 1. TOP BAR */}
        <TopBar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
            if (tab === 'REPORT') setIsHistoryOpen(true)
          }}
          isConnected={isConnected}
          isRecording={isRecording}
          recordingTime={recordingTime}
          onToggleRecording={() => { setIsRecording(r => !r); if (isRecording) setRecordingTime(0) }}
        />

        {/* 2. INFO STRIP (from Image 1 concept) */}
        <InfoStrip navData={navData} />

        {/* 3. MAIN BODY */}
        <div className="tarang-body">
          {/* Left sidebar */}
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(c => !c)}
            displaySettings={displaySettings}
            onDisplayChange={s => setDisplaySettings(p => ({ ...p, ...s }))}
            gainSettings={gainSettings}
            onGainChange={s => setGainSettings(p => ({ ...p, ...s }))}
            navData={navData}
            dgpsFix={dgpsFix}
          />

          {/* Center sonar waterfall */}
          <SonarView
            targets={targets}
            selectedTargetId={selectedTargetId}
            onSelectTarget={setSelectedTargetId}
            onAddTarget={handleAddTarget}
            displaySettings={displaySettings}
          />

          {/* Mini map */}
          <MiniMap targets={targets} selectedTargetId={selectedTargetId} />

          {/* Far-right column: ANALYTICS + MAP LAYERS + SURVEY PLAN */}
          <div className="tarang-right-col">
            <AnalyticsPanel detections={targets} />
            <MapLayers layers={mapLayers} onLayerChange={setMapLayers} />
            <SurveyPlan plan={surveyPlan} />
          </div>
        </div>

        {/* 4. BOTTOM TARGET LOG */}
        <TargetLog
          targets={targets}
          selectedTargetId={selectedTargetId}
          onSelectTarget={setSelectedTargetId}
          collapsed={logCollapsed}
          onToggleCollapse={() => setLogCollapsed(c => !c)}
        />

        {/* Overlays */}
        {apiError && (
          <div style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 9999, width: 340 }}>
            <ErrorBanner error={apiError} onDismiss={() => setApiError(null)} />
          </div>
        )}
        <HistoryPanel
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onSelectJob={handleHistoryJob}
          currentJobId={activeJobId}
        />
      </div>
    </ErrorBoundary>
  )
}