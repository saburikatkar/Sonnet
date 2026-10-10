import React, { useState, useEffect, useCallback } from 'react'
import TopBar        from './components/TopBar/TopBar'
import Sidebar       from './components/Sidebar/Sidebar'
import SonarView     from './components/SonarView/SonarView'
import MiniMap       from './components/MiniMap/MiniMap'
import MapLayers     from './components/MapLayers/MapLayers'
import SurveyPlan    from './components/SurveyPlan/SurveyPlan'
import TargetLog     from './components/TargetLog/TargetLog'
import HistoryPanel  from './components/HistoryPanel'
import AnalyticsPanel from './components/AnalyticsPanel'
import ReportModal   from './components/ReportModal'
import UploadDropzone from './components/UploadDropzone'
import ProcessingStatus from './components/ProcessingStatus'
import ErrorBoundary from './components/ErrorBoundary'
import ErrorBanner   from './components/ErrorBanner'
import { checkHealth, detectFileAsync } from './api/client'
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
  const [isExportOpen,     setIsExportOpen]     = useState(false)
  const [isUploadOpen,     setIsUploadOpen]     = useState(false)

  // ── File upload & real-time detection state ─────────────────────
  const [selectedFile,     setSelectedFile]     = useState(null)
  const [isProcessing,     setIsProcessing]     = useState(false)
  const [stageMessage,     setStageMessage]     = useState('')

  // ── Recording timer ────────────────────────────────────────────
  const [isRecording,    setIsRecording]    = useState(false)
  const [recordingTime,  setRecordingTime]  = useState(0)

  // ── Backend health ─────────────────────────────────────────────
  const [backendStatus, setBackendStatus] = useState('checking')
  const [apiError,      setApiError]      = useState(null)

  // ── Display / gain settings (matched to image defaults) ────────
  const [displaySettings, setDisplaySettings] = useState({
    colorMap: 'MytisBronze',
    brightness: 0,
    contrast: 0,
    gamma: 1.0,
    slantRangeCorrection: true,
    rangeLines: true,
    autoGain: true,
  })
  const [gainSettings, setGainSettings] = useState({
    activeGainMode: 'EGN',
    agc: false, bac: false, egn: true, tvg: false, ugc: false,
    enableEgn: true,
    nadirAngle: 20,
    despeckleFilter: 50,
    userGain: 0,
  })

  // ── Navigation telemetry (WebSocket → live; else mock) ─────────
  const [navData,  setNavData]  = useState(MOCK_NAVIGATION)
  const [dgpsFix,  setDgpsFix]  = useState(true)

  // ── Targets / detection results ────────────────────────────────
  const [targets,           setTargets]           = useState(MOCK_TARGETS)
  const [selectedTargetId,  setSelectedTargetId]  = useState('TRK-071')
  const [activeJobId,       setActiveJobId]        = useState(null)

  // ── Survey & layers ────────────────────────────────────────────
  const [surveyPlan, setSurveyPlan] = useState(MOCK_SURVEY_PLAN)
  const [mapLayers,  setMapLayers]  = useState(MOCK_LAYERS)

  // ── WebSocket for active job telemetry & detections ────────────
  useWebSocket(activeJobId, {
    onMessage: (msg) => {
      if (msg.status === 'completed' && msg.detections?.length) {
        const liveTargets = msg.detections.map((d, i) => ({
          id: d.detection_id || `TRK-${String(i + 1).padStart(3, '0')}`,
          type: d.class_name || 'sonar',
          class: 'Sonar target',
          modelScore: d.confidence || 0.85,
          roi: d.geotag?.side || (i % 2 === 0 ? 'port' : 'starboard'),
          timeS: new Date().toISOString().slice(14, 19),
          frame: `F-${1000 + i * 45}`,
          status: 'Detected',
          bbox: d.bbox ? {
            x: d.bbox.x_min ?? d.bbox.x,
            y: d.bbox.y_min ?? d.bbox.y,
            w: (d.bbox.x_max != null ? d.bbox.x_max - d.bbox.x_min : d.bbox.w) || 0.05,
            h: (d.bbox.y_max != null ? d.bbox.y_max - d.bbox.y_min : d.bbox.h) || 0.15,
          } : { x: 0.3, y: 0.3, w: 0.04, h: 0.15 },
          side: i % 2 === 0 ? 'port' : 'starboard',
          confidence: d.confidence || 0.85,
        }))
        setTargets(liveTargets)
        if (liveTargets[0]) setSelectedTargetId(liveTargets[0].id)
      }
    },
    onNav:   (nav) => { setNavData(nav); setDgpsFix(!!nav.dgpsFix) },
    onStage: (stage) => setStageMessage(stage),
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
    const t = setInterval(probe, 15000)
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
        id: d.detection_id || `TRK-${i + 1}`,
        type: d.class_name || 'sonar',
        class: 'Sonar target',
        modelScore: d.confidence || 0.8,
        roi: d.geotag?.side || 'port',
        timeS: '--',
        frame: `F-${i + 1}`,
        status: 'Detected',
        bbox: d.bbox || { x: 0.3, y: 0.3, w: 0.04, h: 0.15 },
        side: 'port',
        confidence: d.confidence || 0.8,
      })))
    }
    setIsHistoryOpen(false)
  }, [])

  // Handle file detection upload pipeline
  const handleStartDetection = async () => {
    if (!selectedFile) return
    setIsProcessing(true)
    setApiError(null)
    try {
      const result = await detectFileAsync(selectedFile, {
        onStageChange: (stage) => setStageMessage(stage),
        onJobRegistered: (jobId) => setActiveJobId(jobId),
      })
      if (result?.detections?.length) {
        const mapped = result.detections.map((d, i) => ({
          id: d.detection_id || `TRK-${String(i + 1).padStart(3, '0')}`,
          type: d.class_name || 'sonar',
          class: 'Sonar target',
          modelScore: d.confidence || 0.9,
          roi: i % 2 === 0 ? 'port' : 'starboard',
          timeS: new Date().toISOString().slice(14, 19),
          frame: `F-${800 + i * 50}`,
          status: 'Detected',
          bbox: d.bbox ? {
            x: d.bbox.x_min ?? d.bbox.x,
            y: d.bbox.y_min ?? d.bbox.y,
            w: (d.bbox.x_max != null ? d.bbox.x_max - d.bbox.x_min : d.bbox.w) || 0.04,
            h: (d.bbox.y_max != null ? d.bbox.y_max - d.bbox.y_min : d.bbox.h) || 0.15,
          } : { x: 0.3, y: 0.3, w: 0.04, h: 0.15 },
          side: i % 2 === 0 ? 'port' : 'starboard',
          confidence: d.confidence || 0.9,
        }))
        setTargets(mapped)
        if (mapped[0]) setSelectedTargetId(mapped[0].id)
      }
      setIsUploadOpen(false)
    } catch (err) {
      setApiError(err)
    } finally {
      setIsProcessing(false)
    }
  }

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
            if (tab === 'EXPORT') setIsExportOpen(true)
            if (tab === 'PROCESSING') setIsUploadOpen(true)
          }}
          isConnected={isConnected}
          isRecording={isRecording}
          recordingTime={recordingTime}
          onToggleRecording={() => { setIsRecording(r => !r); if (isRecording) setRecordingTime(0) }}
        />

        {/* 2. MAIN BODY */}
        <div className="tarang-body">
          {/* Left sidebar: DISPLAY + GAIN & PROCESSING + NAVIGATION */}
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

          {/* Mini map (GIS Nautical Chart) */}
          <MiniMap targets={targets} selectedTargetId={selectedTargetId} />

          {/* Far-right column: MAP LAYERS + SURVEY PLAN or ANALYTICS */}
          <div className="tarang-right-col">
            {activeTab === 'ANALYSIS' ? (
              <AnalyticsPanel detections={targets} />
            ) : (
              <>
                <MapLayers layers={mapLayers} onLayerChange={setMapLayers} />
                <SurveyPlan plan={surveyPlan} />
              </>
            )}
          </div>
        </div>

        {/* 3. BOTTOM TARGET LOG */}
        <TargetLog
          targets={targets}
          selectedTargetId={selectedTargetId}
          onSelectTarget={setSelectedTargetId}
          collapsed={logCollapsed}
          onToggleCollapse={() => setLogCollapsed(c => !c)}
        />

        {/* 4. MODALS & OVERLAYS */}
        {/* Error notification banner */}
        {apiError && (
          <div style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 9999, width: 340 }}>
            <ErrorBanner error={apiError} onDismiss={() => setApiError(null)} />
          </div>
        )}

        {/* History / Past Reports Modal */}
        <HistoryPanel
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onSelectJob={handleHistoryJob}
          currentJobId={activeJobId}
        />

        {/* Export Report Modal */}
        {isExportOpen && (
          <ReportModal
            detections={targets}
            fileName={selectedFile?.name || 'TARANG_SURVEY_01'}
            onClose={() => setIsExportOpen(false)}
          />
        )}

        {/* Processing / Upload Modal */}
        {isUploadOpen && (
          <div className="modal-overlay" onClick={() => setIsUploadOpen(false)}>
            <div className="portal-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
              <div className="portal-modal__header">
                <div className="modal-title-group">
                  <span className="modal-badge">SONAR DETECTION PIPELINE</span>
                  <h3>Upload Sonar Survey Data (.xtf, .jsf, .png)</h3>
                </div>
                <button type="button" className="modal-close-btn" onClick={() => setIsUploadOpen(false)}>
                  &times;
                </button>
              </div>
              <div className="portal-modal__body">
                <UploadDropzone
                  onFileSelected={setSelectedFile}
                  selectedFile={selectedFile}
                  isProcessing={isProcessing}
                  onStartDetection={handleStartDetection}
                />
                {isProcessing && (
                  <ProcessingStatus
                    stageMessage={stageMessage}
                    onCancel={() => setIsProcessing(false)}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}