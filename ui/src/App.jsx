import React, { useState, useEffect, useCallback, useMemo } from 'react'
import TopBar from './components/TopBar/TopBar'
import Sidebar from './components/Sidebar/Sidebar'
import SonarView from './components/SonarView/SonarView'
import TargetInspector from './components/TargetInspector/TargetInspector'
import TargetLog from './components/TargetLog/TargetLog'
import HistoryPanel from './components/HistoryPanel'
import AnalyticsPanel from './components/AnalyticsPanel'
import ReportModal from './components/ReportModal'
import UploadDropzone from './components/UploadDropzone'
import ProcessingStatus from './components/ProcessingStatus'
import ErrorBoundary from './components/ErrorBoundary'
import ErrorBanner from './components/ErrorBanner'
import { checkHealth, detectFileAsync } from './api/client'
import { useWebSocket } from './hooks/useWebSocket'
import {
  MOCK_NAVIGATION, MOCK_TARGETS, DEFAULT_SONAR_IMAGE,
} from './mock/mockData'

export default function App() {
  // ── Navigation tabs ────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('LIVE')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [logCollapsed, setLogCollapsed] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  // ── File upload & real-time detection state ─────────────────────
  const [selectedFile, setSelectedFile] = useState(null)
  const [imageUrl, setImageUrl] = useState(DEFAULT_SONAR_IMAGE)
  const [isProcessing, setIsProcessing] = useState(false)
  const [stageMessage, setStageMessage] = useState('')

  // ── Backend health ─────────────────────────────────────────────
  const [backendStatus, setBackendStatus] = useState('checking')
  const [apiError, setApiError] = useState(null)

  // ── Display settings (applied dynamically on canvas) ──────────
  const [displaySettings, setDisplaySettings] = useState({
    colorMap: 'MytisBronze',
    brightness: 0,
    contrast: 0,
  })

  // ── Functional AI detection filters ─────────────────────────────
  const [minConfidence, setMinConfidence] = useState(0.20)
  const [selectedClasses, setSelectedClasses] = useState([])

  // ── Navigation telemetry ───────────────────────────────────────
  const [navData, setNavData] = useState(MOCK_NAVIGATION)
  const [dgpsFix, setDgpsFix] = useState(true)

  // ── Targets / detections ───────────────────────────────────────
  const [targets, setTargets] = useState(MOCK_TARGETS)
  const [selectedTargetId, setSelectedTargetId] = useState('TRK-001')
  const [activeJobId, setActiveJobId] = useState(null)

  // ── WebSocket for active job telemetry & detections ────────────
  useWebSocket(activeJobId, {
    onMessage: (msg) => {
      if (msg.status === 'completed' && msg.detections?.length) {
        const liveTargets = msg.detections.map((d, i) => ({
          id: d.detection_id || `TRK-${String(i + 1).padStart(3, '0')}`,
          type: d.class_name || 'sonar',
          class: d.class_name ? d.class_name.replace('_', ' ').toUpperCase() : 'Sonar Target',
          modelScore: d.confidence || 0.85,
          confidence: d.confidence || 0.85,
          roi: d.geotag?.channel || (i % 2 === 0 ? 'port' : 'starboard'),
          side: d.geotag?.channel || (i % 2 === 0 ? 'port' : 'starboard'),
          timeS: new Date().toISOString().slice(14, 19),
          frame: `F-${1000 + i * 45}`,
          status: 'Detected',
          bbox: d.bbox ? {
            x: d.bbox.x_min ?? d.bbox.x,
            y: d.bbox.y_min ?? d.bbox.y,
            w: (d.bbox.x_max != null ? d.bbox.x_max - d.bbox.x_min : d.bbox.w) || 0.05,
            h: (d.bbox.y_max != null ? d.bbox.y_max - d.bbox.y_min : d.bbox.h) || 0.15,
          } : { x: 0.3, y: 0.3, w: 0.04, h: 0.15 },
          geotag: d.geotag,
          thumbnailUrl: imageUrl || DEFAULT_SONAR_IMAGE,
        }))
        setTargets(liveTargets)
        if (liveTargets[0]) setSelectedTargetId(liveTargets[0].id)
      }
    },
    onNav: (nav) => { setNavData(nav); setDgpsFix(!!nav.dgpsFix) },
    onStage: (stage) => setStageMessage(stage),
  })

  // ── Backend health probe (fast startup polling) ────────────────
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
    const t = setInterval(probe, 3000)
    return () => { mounted = false; clearInterval(t) }
  }, [])

  // ── Filtered targets based on confidence & class ────────────────
  const filteredTargets = useMemo(() => {
    return targets.filter(t => {
      const score = t.confidence ?? t.modelScore ?? 0.85
      if (score < minConfidence) return false
      if (selectedClasses.length > 0 && !selectedClasses.includes(t.type)) return false
      return true
    })
  }, [targets, minConfidence, selectedClasses])

  // Count by class for filter badges
  const classCounts = useMemo(() => {
    return targets.reduce((acc, t) => {
      const k = t.type || 'unknown'
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {})
  }, [targets])

  // Currently selected target object
  const selectedTarget = useMemo(() => {
    return targets.find(t => t.id === selectedTargetId) || filteredTargets[0] || null
  }, [targets, selectedTargetId, filteredTargets])

  // ── Handlers ───────────────────────────────────────────────────
  const handleToggleClass = useCallback((classKey) => {
    setSelectedClasses(prev => {
      if (prev.includes(classKey)) return prev.filter(c => c !== classKey)
      return [...prev, classKey]
    })
  }, [])

  const handleUpdateTargetStatus = useCallback((targetId, newStatus) => {
    setTargets(prev => prev.map(t => (t.id === targetId ? { ...t, status: newStatus } : t)))
  }, [])

  const handleAddTarget = useCallback((t) => setTargets(prev => [t, ...prev]), [])

  const handleHistoryJob = useCallback((jobData) => {
    if (!jobData) return
    setActiveJobId(jobData.job_id)
    if (jobData.detections?.length) {
      setTargets(jobData.detections.map((d, i) => ({
        id: d.detection_id || `TRK-${i + 1}`,
        type: d.class_name || 'sonar',
        class: d.class_name ? d.class_name.replace('_', ' ').toUpperCase() : 'Sonar target',
        modelScore: d.confidence || 0.85,
        confidence: d.confidence || 0.85,
        roi: d.geotag?.channel || 'port',
        side: d.geotag?.channel || 'port',
        timeS: '00:15.0',
        frame: `F-${1000 + i * 20}`,
        status: 'Detected',
        bbox: d.bbox ? {
          x: d.bbox.x_min ?? d.bbox.x,
          y: d.bbox.y_min ?? d.bbox.y,
          w: (d.bbox.x_max != null ? d.bbox.x_max - d.bbox.x_min : d.bbox.w) || 0.05,
          h: (d.bbox.y_max != null ? d.bbox.y_max - d.bbox.y_min : d.bbox.h) || 0.15,
        } : { x: 0.3, y: 0.3, w: 0.04, h: 0.15 },
        geotag: d.geotag,
        thumbnailUrl: DEFAULT_SONAR_IMAGE,
      })))
    }
    setIsHistoryOpen(false)
  }, [])

  const [hasUploadedScan, setHasUploadedScan] = useState(false)

  // Crop acoustic region around detected bounding box for high-resolution target inspector
  const generateDetectionCrops = useCallback(async (rawDetections, imageSrc) => {
    if (!imageSrc || !rawDetections?.length || typeof document === 'undefined') return rawDetections

    return new Promise((resolve) => {
      const img = new Image()
      if (!imageSrc.startsWith('blob:') && !imageSrc.startsWith('data:')) {
        img.crossOrigin = 'anonymous'
      }
      img.onload = () => {
        const iw = img.naturalWidth || img.width
        const ih = img.naturalHeight || img.height

        const enriched = rawDetections.map((d) => {
          try {
            const bbox = d.bbox || {}
            const xmin = bbox.x ?? bbox.x_min ?? 0.2
            const ymin = bbox.y ?? bbox.y_min ?? 0.2
            const wFrac = bbox.w ?? (bbox.x_max != null ? bbox.x_max - bbox.x_min : 0.05)
            const hFrac = bbox.h ?? (bbox.y_max != null ? bbox.y_max - bbox.y_min : 0.1)

            const x = Math.max(0, xmin * iw)
            const y = Math.max(0, ymin * ih)
            const w = Math.max(10, wFrac * iw)
            const h = Math.max(10, hFrac * ih)

            const padX = w * 0.25
            const padY = h * 0.25
            const sx = Math.max(0, x - padX)
            const sy = Math.max(0, y - padY)
            const sw = Math.min(iw - sx, w + padX * 2)
            const sh = Math.min(ih - sy, h + padY * 2)

            const canvas = document.createElement('canvas')
            canvas.width = 180
            canvas.height = 140
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
            return {
              ...d,
              thumbnailUrl: canvas.toDataURL('image/jpeg', 0.85),
            }
          } catch {
            return d
          }
        })
        resolve(enriched)
      }
      img.onerror = () => resolve(rawDetections)
      img.src = imageSrc
    })
  }, [])

  // Process user uploaded file: load image and run YOLO detection pipeline
  const handleFileSelected = useCallback(async (file) => {
    if (!file) return
    setSelectedFile(file)
    setHasUploadedScan(true)
    setApiError(null)

    let localUrl = null
    const isImage = /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(file.name)
    if (isImage) {
      try {
        localUrl = URL.createObjectURL(file)
        setImageUrl(localUrl)
      } catch (e) {
        console.warn('Could not create object URL for file:', e)
      }
    }

    setIsProcessing(true)
    setStageMessage('Uploading scan to YOLOv11s inference pipeline...')
    try {
      const result = await detectFileAsync(file, {
        onStageChange: (stage) => setStageMessage(stage),
        onJobRegistered: (jobId) => setActiveJobId(jobId),
      })

      if (result?.detections && result.detections.length > 0) {
        const mapped = result.detections.map((d, i) => ({
          id: d.detection_id || `TRK-${String(i + 1).padStart(3, '0')}`,
          type: d.class_name || 'sonar',
          class: d.class_name ? d.class_name.replace(/_/g, ' ').toUpperCase() : 'Sonar Target',
          modelScore: d.confidence || 0.85,
          confidence: d.confidence || 0.85,
          roi: d.geotag?.channel || (i % 2 === 0 ? 'port' : 'starboard'),
          side: d.geotag?.channel || (i % 2 === 0 ? 'port' : 'starboard'),
          timeS: new Date().toISOString().slice(14, 19),
          frame: `F-${800 + i * 50}`,
          status: 'Detected',
          bbox: d.bbox ? {
            x: d.bbox.x_min ?? d.bbox.x,
            y: d.bbox.y_min ?? d.bbox.y,
            w: (d.bbox.x_max != null ? d.bbox.x_max - d.bbox.x_min : d.bbox.w) || 0.04,
            h: (d.bbox.y_max != null ? d.bbox.y_max - d.bbox.y_min : d.bbox.h) || 0.15,
          } : { x: 0.3, y: 0.3, w: 0.04, h: 0.15 },
          geotag: d.geotag,
          thumbnailUrl: localUrl || DEFAULT_SONAR_IMAGE,
        }))

        const enriched = await generateDetectionCrops(mapped, localUrl || DEFAULT_SONAR_IMAGE)
        setTargets(enriched)
        if (enriched[0]) setSelectedTargetId(enriched[0].id)
      } else {
        // Clear targets if model returns 0 detections on user image
        setTargets([])
        setSelectedTargetId(null)
      }
      setIsUploadOpen(false)
    } catch (err) {
      const friendlyErr = {
        code: err.code || 'API_ERROR',
        message: err.message === 'Failed to fetch'
          ? 'Cannot connect to backend server at http://127.0.0.1:8000. Ensure the backend is running.'
          : err.message || 'Detection failed.',
        details: err.details,
      }
      setApiError(friendlyErr)
    } finally {
      setIsProcessing(false)
    }
  }, [generateDetectionCrops])

  const handleStartDetection = () => {
    if (selectedFile) handleFileSelected(selectedFile)
  }

  // Reset back to sample demo scan
  const handleResetDemo = useCallback(() => {
    setSelectedFile(null)
    setHasUploadedScan(false)
    setImageUrl(DEFAULT_SONAR_IMAGE)
    setTargets(MOCK_TARGETS)
    if (MOCK_TARGETS[0]) setSelectedTargetId(MOCK_TARGETS[0].id)
  }, [])

  const isConnected = backendStatus === 'online'

  return (
    <ErrorBoundary>
      <div className="tarang-shell">
        {/* 1. TOP BAR */}
        <TopBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isConnected={isConnected}
          onOpenUpload={() => setIsUploadOpen(true)}
          onFileSelected={handleFileSelected}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
        />

        {/* 2. MAIN WORKSPACE */}
        {activeTab === 'ANALYSIS' ? (
          <div className="tarang-body tarang-body--analytics">
            <AnalyticsPanel detections={targets} />
          </div>
        ) : (
          <div className="tarang-body">
            {/* Left: Controls & Telemetry */}
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(c => !c)}
              displaySettings={displaySettings}
              onDisplayChange={s => setDisplaySettings(p => ({ ...p, ...s }))}
              minConfidence={minConfidence}
              onConfidenceChange={setMinConfidence}
              selectedClasses={selectedClasses}
              onToggleClass={handleToggleClass}
              classCounts={classCounts}
              navData={navData}
              dgpsFix={dgpsFix}
            />

            {/* Center: Sonar Waterfall (Dominant display) */}
            <SonarView
              targets={filteredTargets}
              selectedTargetId={selectedTargetId}
              onSelectTarget={setSelectedTargetId}
              onAddTarget={handleAddTarget}
              displaySettings={displaySettings}
              imageUrl={imageUrl}
              onFileSelected={handleFileSelected}
              onResetDemo={handleResetDemo}
              isProcessing={isProcessing}
              stageMessage={stageMessage}
              hasUploadedScan={hasUploadedScan}
            />

            {/* Right: Anomaly Details & Verification */}
            <TargetInspector
              selectedTarget={selectedTarget}
              targets={targets}
              onUpdateTargetStatus={handleUpdateTargetStatus}
              onOpenExport={() => setIsExportOpen(true)}
              onOpenUpload={() => setIsUploadOpen(true)}
              onFileSelected={handleFileSelected}
            />
          </div>
        )}

        {/* 3. BOTTOM TARGET DETECTION LOG */}
        <TargetLog
          targets={filteredTargets}
          selectedTargetId={selectedTargetId}
          onSelectTarget={setSelectedTargetId}
          onUpdateTargetStatus={handleUpdateTargetStatus}
          collapsed={logCollapsed}
          onToggleCollapse={() => setLogCollapsed(c => !c)}
        />

        {/* 4. MODALS */}
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

        {isExportOpen && (
          <ReportModal
            detections={targets}
            fileName={selectedFile?.name || 'SONNET_SURVEY_01'}
            onClose={() => setIsExportOpen(false)}
          />
        )}

        {isUploadOpen && (
          <div className="modal-overlay" onClick={() => setIsUploadOpen(false)}>
            <div className="portal-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
              <div className="portal-modal__header">
                <div className="modal-title-group">
                  <span className="modal-badge">YOLOv11 DETECTION PIPELINE</span>
                  <h3>Process Sonar Survey File (.xtf, .jsf, image)</h3>
                </div>
                <button type="button" className="modal-close-btn" onClick={() => setIsUploadOpen(false)}>
                  &times;
                </button>
              </div>
              <div className="portal-modal__body">
                <UploadDropzone
                  onFileSelected={handleFileSelected}
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