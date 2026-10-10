import React, { useState, useRef, useEffect } from 'react'
import Header from './components/Header'
import UploadDropzone from './components/UploadDropzone'
import ProcessingStatus from './components/ProcessingStatus'
import ErrorBanner from './components/ErrorBanner'
import DetectionViewer from './components/DetectionViewer'
import ResultList from './components/ResultList'
import GeospatialMap from './components/GeospatialMap'
import ReportModal from './components/ReportModal'
import { detectFileAsync } from './api/client'

// Sample fallback dataset matching B2 approved contract for instant demonstration
const SAMPLE_DETECTIONS = [
  {
    detection_id: "det_001",
    class_name: "plastic",
    confidence: 0.94,
    bbox: {
      x_min: 0.12,
      y_min: 0.18,
      x_max: 0.32,
      y_max: 0.36
    },
    geotag: {
      latitude: 45.1234,
      longitude: -12.4567,
      depth_meters: 14.5
    }
  },
  {
    detection_id: "det_002",
    class_name: "fishing_net",
    confidence: 0.88,
    bbox: {
      x_min: 0.45,
      y_min: 0.40,
      x_max: 0.72,
      y_max: 0.65
    },
    geotag: {
      latitude: 45.1245,
      longitude: -12.4542,
      depth_meters: 18.2
    }
  },
  {
    detection_id: "det_003",
    class_name: "tire",
    confidence: 0.81,
    bbox: {
      x_min: 0.20,
      y_min: 0.65,
      x_max: 0.35,
      y_max: 0.80
    },
    geotag: {
      latitude: 45.1219,
      longitude: -12.4589,
      depth_meters: 15.1
    }
  },
  {
    detection_id: "det_004",
    class_name: "metal",
    confidence: 0.76,
    bbox: {
      x_min: 0.75,
      y_min: 0.15,
      x_max: 0.92,
      y_max: 0.32
    },
    geotag: {
      latitude: 45.1256,
      longitude: -12.4510,
      depth_meters: 21.0
    }
  }
]

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [stageMessage, setStageMessage] = useState('')
  const [apiError, setApiError] = useState(null)
  const [activeJobId, setActiveJobId] = useState(null)
  const [detections, setDetections] = useState([])
  const [selectedDetectionId, setSelectedDetectionId] = useState(null)
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [activeViewTab, setActiveViewTab] = useState('viewer') // 'viewer' | 'map'
  const abortControllerRef = useRef(null)

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // Handle file selection and preview creation
  function handleFileSelected(file) {
    if (isProcessing) handleCancelOperation()
    setSelectedFile(file)
    setApiError(null)

    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }

  // Cancel in-flight request & close WebSocket
  function handleCancelOperation() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsProcessing(false)
    setStageMessage('Detection cancelled by user.')
  }

  // Execute Async Detection using real-time WebSocket push updates (Phase 4)
  async function handleStartDetection() {
    if (!selectedFile) return

    setIsProcessing(true)
    setApiError(null)
    setStageMessage('Uploading sonar payload and registering async job...')
    abortControllerRef.current = new AbortController()

    try {
      const result = await detectFileAsync(selectedFile, {
        signal: abortControllerRef.current.signal,
        onStageChange: (stage, meta) => {
          setStageMessage(stage)
          if (meta?.jobId) setActiveJobId(meta.jobId)
        },
      })

      setActiveJobId(result.job_id || null)
      const results = result.detections || []
      setDetections(results)
      if (results.length > 0) {
        setSelectedDetectionId(results[0].detection_id)
      }
      setStageMessage('Inference completed successfully.')
    } catch (err) {
      if (err.name === 'AbortError') {
        setApiError({
          code: 'OPERATION_ABORTED',
          message: 'The detection request was cancelled by user.',
        })
      } else {
        setApiError({
          code: err.code || 'API_CONNECTION_ERROR',
          message: err.message || 'Failed to communicate with FastAPI backend at localhost:8000',
          details: err.details,
        })
      }
    } finally {
      setIsProcessing(false)
      abortControllerRef.current = null
    }
  }

  // Load sample dataset for demonstration when backend is offline
  function handleLoadSampleData() {
    setDetections(SAMPLE_DETECTIONS)
    setSelectedDetectionId(SAMPLE_DETECTIONS[0].detection_id)
    setApiError(null)
  }

  function handleResetAll() {
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setDetections([])
    setSelectedDetectionId(null)
    setApiError(null)
    setActiveJobId(null)
  }

  return (
    <div className="synora-app">
      <Header />

      <main className="synora-main">
        {/* Top Control Bar */}
        <section className="top-banner">
          <div className="top-banner__info">
            <h2>Underwater Debris &amp; Anomaly Detection</h2>
            <p>
              Autonomous sidescan sonar processing with real-time WebSocket push updates (`ws://127.0.0.1:8000/api/v1/jobs/&#123;id&#125;/ws`).
            </p>
          </div>

          <div className="top-banner__actions">
            {detections.length > 0 && (
              <>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => setIsExportOpen(true)}
                >
                  📥 Export Report ({detections.length})
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={handleResetAll}
                >
                  🔄 Reset
                </button>
              </>
            )}

            {detections.length === 0 && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={handleLoadSampleData}
                title="Load sample schema-compliant detections"
              >
                Load Sample Contract Data
              </button>
            )}
          </div>
        </section>

        {/* Upload & Stage Area */}
        <section className="upload-container">
          <UploadDropzone
            onFileSelected={handleFileSelected}
            selectedFile={selectedFile}
            isProcessing={isProcessing}
            onStartDetection={handleStartDetection}
          />
        </section>

        {/* In-Flight Processing Status with Real-Time WebSocket Streaming Indicator */}
        {isProcessing && (
          <section className="status-container">
            <ProcessingStatus
              stageMessage={stageMessage}
              onCancel={handleCancelOperation}
            />
          </section>
        )}

        {/* Standard Error Banner */}
        {apiError && (
          <section className="error-container">
            <ErrorBanner
              error={apiError}
              onRetry={handleStartDetection}
              onDismiss={() => setApiError(null)}
            />
          </section>
        )}

        {/* Detection Results & Inspection Views */}
        {detections.length > 0 && (
          <section className="inspection-workspace">
            {/* View Switcher Tabs */}
            <div className="workspace-tabs">
              <button
                type="button"
                className={`tab-btn ${activeViewTab === 'viewer' ? 'tab-btn--active' : ''}`}
                onClick={() => setActiveViewTab('viewer')}
              >
                🖼️ Sonar Viewer &amp; Overlays
              </button>
              <button
                type="button"
                className={`tab-btn ${activeViewTab === 'map' ? 'tab-btn--active' : ''}`}
                onClick={() => setActiveViewTab('map')}
              >
                🧭 Geospatial Plot (WGS84)
              </button>
              {activeJobId && (
                <span className="job-indicator">Active Job: {activeJobId}</span>
              )}
            </div>

            <div className="workspace-grid">
              {/* Left Pane: Sonar Viewer or GIS Map */}
              <div className="workspace-pane workspace-pane--primary">
                {activeViewTab === 'viewer' ? (
                  <DetectionViewer
                    imageUrl={previewUrl}
                    detections={detections}
                    selectedDetectionId={selectedDetectionId}
                    onSelectDetection={setSelectedDetectionId}
                    confidenceThreshold={confidenceThreshold}
                    onThresholdChange={setConfidenceThreshold}
                  />
                ) : (
                  <GeospatialMap
                    detections={detections}
                    selectedDetectionId={selectedDetectionId}
                    onSelectDetection={setSelectedDetectionId}
                  />
                )}
              </div>

              {/* Right Pane: Itemized Results List */}
              <div className="workspace-pane workspace-pane--secondary">
                <ResultList
                  detections={detections}
                  selectedDetectionId={selectedDetectionId}
                  onSelectDetection={setSelectedDetectionId}
                  confidenceThreshold={confidenceThreshold}
                />
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Export Report Modal */}
      {isExportOpen && (
        <ReportModal
          detections={detections}
          fileName={selectedFile?.name || 'sonar_scan'}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </div>
  )
}