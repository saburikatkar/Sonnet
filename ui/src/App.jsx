import React, { useState, useRef, useEffect } from 'react'
import UploadDropzone from './components/UploadDropzone'
import ProcessingStatus from './components/ProcessingStatus'
import ErrorBanner from './components/ErrorBanner'
import DetectionViewer from './components/DetectionViewer'
import ResultList from './components/ResultList'
import GeospatialMap from './components/GeospatialMap'
import ReportModal from './components/ReportModal'
import HistoryPanel from './components/HistoryPanel'
import { checkHealth, detectFileAsync } from './api/client'

// Curated sample detection annotations corresponding to the sonar display
const SONAR_HERO_DETECTIONS = [
  {
    detection_id: 'det_hero_01',
    class_name: 'shipwreck',
    label: 'Wreck 0.94',
    confidence: 0.94,
    bbox: { x_min: 0.48, y_min: 0.28, x_max: 0.72, y_max: 0.44 },
    geotag: { latitude: 36.1428, longitude: -115.1531, depth_meters: 28.5 },
  },
  {
    detection_id: 'det_hero_02',
    class_name: 'plastic',
    label: 'Debris 0.78',
    confidence: 0.78,
    bbox: { x_min: 0.74, y_min: 0.16, x_max: 0.79, y_max: 0.23 },
    geotag: { latitude: 36.1432, longitude: -115.1524, depth_meters: 19.8 },
  },
  {
    detection_id: 'det_hero_03',
    class_name: 'unknown',
    label: 'Anomaly 0.87',
    confidence: 0.87,
    bbox: { x_min: 0.83, y_min: 0.32, x_max: 0.89, y_max: 0.40 },
    geotag: { latitude: 36.1425, longitude: -115.1518, depth_meters: 22.4 },
  },
]

export default function App() {
  // Navigation & View State
  const [activeNav, setActiveNav] = useState('Home')
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Backend Health Telemetry
  const [backendStatus, setBackendStatus] = useState('checking')

  // Interactive Live Detection State
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [stageMessage, setStageMessage] = useState('')
  const [apiError, setApiError] = useState(null)
  const [activeJobId, setActiveJobId] = useState(null)
  const [detections, setDetections] = useState(SONAR_HERO_DETECTIONS)
  const [selectedDetectionId, setSelectedDetectionId] = useState('det_hero_01')
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('viewer') // 'viewer' | 'map'
  const abortControllerRef = useRef(null)

  // Probe backend status on mount
  useEffect(() => {
    let isMounted = true
    async function probe() {
      try {
        const res = await checkHealth()
        if (isMounted) {
          setBackendStatus(res.status === 'ok' ? 'online' : 'degraded')
        }
      } catch {
        if (isMounted) {
          setBackendStatus('offline')
        }
      }
    }
    probe()
    const timer = setInterval(probe, 20000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [])

  function handleSelectHistoricalJob(jobData) {
    if (!jobData) return
    setActiveJobId(jobData.job_id)
    if (jobData.detections && jobData.detections.length > 0) {
      setDetections(jobData.detections)
      setSelectedDetectionId(jobData.detections[0].detection_id)
    }
    setStageMessage(`Loaded historical mission ${jobData.job_id} into workspace.`)
    const wsEl = document.getElementById('live-workspace')
    if (wsEl) {
      wsEl.scrollIntoView({ behavior: 'smooth' })
    }
  }

  function handleFileSelected(file) {
    if (isProcessing) handleCancelOperation()
    setSelectedFile(file)
    setApiError(null)

    if (file && file.type.startsWith('image/')) {
      // Revoke previous blob URL to prevent memory leak
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(file)
      })
    } else {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }

  function handleCancelOperation() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsProcessing(false)
    setStageMessage('Operation cancelled by operator.')
  }

  async function handleStartDetection() {
    if (!selectedFile) return
    setIsProcessing(true)
    setApiError(null)
    setStageMessage('Submitting sonar dataset...')
    abortControllerRef.current = new AbortController()

    try {
      const result = await detectFileAsync(selectedFile, {
        signal: abortControllerRef.current.signal,
        onStageChange: (stage) => setStageMessage(stage),
        onJobRegistered: (id) => setActiveJobId(id),
      })

      setActiveJobId(result.job_id || null)
      if (result.detections && result.detections.length > 0) {
        setDetections(result.detections)
        setSelectedDetectionId(result.detections[0].detection_id)
      } else {
        setDetections([])
        setSelectedDetectionId(null) // clear stale reference
      }
      setStageMessage('Detection analysis complete.')
    } catch (err) {
      if (err.name === 'AbortError') {
        setApiError({ code: 'ABORTED', message: 'Detection was cancelled.' })
      } else {
        setApiError({
          code: err.code || 'API_ERROR',
          message: err.message || 'Failed to reach FastAPI detection engine. (Using live demo simulation)',
          details: err.details,
        })
      }
    } finally {
      setIsProcessing(false)
      abortControllerRef.current = null
    }
  }

  return (
    <div className="sonarai-app">
      {/* ================= 1. TOP NAVBAR ================= */}
      <header className="navbar">
        <div className="navbar__container">
          {/* Brand Logo */}
          <div className="navbar__brand" onClick={() => setActiveNav('Home')}>
            <div className="brand-logo-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeOpacity="0.4" />
                <circle cx="12" cy="12" r="6" stroke="#fbbf24" strokeOpacity="0.8" />
                <circle cx="12" cy="12" r="2" fill="#fbbf24" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10" stroke="#f59e0b" />
                <path d="M12 2a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10" stroke="#f59e0b" />
              </svg>
            </div>
            <div className="brand-text">
              <span className="brand-title">SONARAI</span>
              <span className="brand-subtitle">MARINE INSIGHTS</span>
            </div>
          </div>

          {/* Navigation Menu Pill */}
          <nav className="nav-pill">
            {['Home', 'About', 'Dataset', 'Methodology', 'Results', 'History', 'Gallery', 'Contact'].map((item) => (
              <button
                key={item}
                type="button"
                className={`nav-pill__item ${activeNav === item ? 'nav-pill__item--active' : ''}`}
                onClick={() => {
                  setActiveNav(item)
                  if (item === 'History') setIsHistoryOpen(true)
                  if (item === 'Results' || item === 'Gallery') setIsDemoModalOpen(true)
                }}
              >
                {item}
              </button>
            ))}
          </nav>

          {/* Search & Action Controls */}
          <div className="navbar__actions">
            <div className="search-bar">
              <span className="search-bar__icon">🔍</span>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-bar__input"
              />
            </div>

            {/* Backend health pill */}
            <button
              type="button"
              className="btn-history-trigger"
              onClick={() => setIsHistoryOpen(true)}
              title="View Mission History"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" stroke="#f59e0b" />
                <polyline points="12 6 12 12 16 14" stroke="#fbbf24" />
              </svg>
              <span>History</span>
            </button>
            <div className={`health-indicator health-indicator--${backendStatus}`} title={`Backend: ${backendStatus}`}>
              <span className="health-dot" />
              <span className="health-label">API {backendStatus}</span>
            </div>

            <button
              type="button"
              className="btn btn--portal"
              onClick={() => setIsDemoModalOpen(true)}
            >
              <span>Research Portal</span>
              <span className="btn-arrow">&rarr;</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= 2. MAIN HERO & SONAR DISPLAY ================= */}
      <main className="main-content">
        <section className="hero-section">
          {/* Hero Left Content */}
          <div className="hero-content">
            <div className="hero-pill-badge">
              <span>CLEANER OCEANS</span>
              <span className="pill-sep">&bull;</span>
              <span>SMARTER DETECTION</span>
              <span className="pill-sep">&bull;</span>
              <span>SAFER FUTURES</span>
            </div>

            <h1 className="hero-title">
              AI-POWERED <br />
              <span className="hero-title--gradient">MARINE DEBRIS &amp;</span> <br />
              <span className="hero-title--gradient">ANOMALY DETECTION</span> <br />
              <span className="hero-title--sub">in Side-Scan Sonar (SSS) Imagery</span>
            </h1>

            <p className="hero-description">
              Leveraging advanced AI and deep learning to detect marine debris and unknown anomalies
              in side-scan sonar imagery, enabling cleaner oceans and more efficient underwater monitoring.
            </p>

            <div className="hero-actions">
              <button
                type="button"
                className="btn btn--explore"
                onClick={() => setIsDemoModalOpen(true)}
              >
                Explore the Research &rarr;
              </button>
              <button
                type="button"
                className="btn btn--demo"
                onClick={() => setIsDemoModalOpen(true)}
              >
                <span className="play-icon">&#9658;</span> View Live Demo
              </button>
            </div>
          </div>

          {/* Center/Right Sonar Display Stage */}
          <div className="sonar-stage-card">
            {/* Top Coordinate / Distance Ruler */}
            <div className="sonar-ruler">
              <div className="sonar-ruler__line" />
              <div className="sonar-ruler__ticks">
                <span className="ruler-tick">0m</span>
                <span className="ruler-tick">50</span>
                <span className="ruler-tick">100</span>
                <span className="ruler-tick">150</span>
                <span className="ruler-tick">200</span>
                <span className="ruler-tick">250 m</span>
              </div>
            </div>

            {/* Sonar Scan Canvas / Image */}
            <div className="sonar-canvas-wrap">
              <img
                src="./assets/sonar_shipwreck_scan.jpg"
                alt="Side-Scan Sonar Acoustic Imagery"
                className="sonar-background-img"
              />

              {/* Bounding Box 1: Wreck 0.94 */}
              <div
                className="sonar-bbox sonar-bbox--wreck"
                style={{ left: '48%', top: '28%', width: '24%', height: '17%' }}
                onClick={() => setSelectedDetectionId('det_hero_01')}
              >
                <span className="sonar-bbox__tag">Wreck 0.94</span>
                <div className="bbox-corner tl" />
                <div className="bbox-corner tr" />
                <div className="bbox-corner bl" />
                <div className="bbox-corner br" />
              </div>

              {/* Bounding Box 2: Debris 0.78 */}
              <div
                className="sonar-bbox sonar-bbox--debris"
                style={{ left: '74%', top: '16%', width: '6%', height: '8%' }}
                onClick={() => setSelectedDetectionId('det_hero_02')}
              >
                <span className="sonar-bbox__tag">Debris 0.78</span>
                <div className="bbox-corner tl" />
                <div className="bbox-corner tr" />
                <div className="bbox-corner bl" />
                <div className="bbox-corner br" />
              </div>

              {/* Bounding Box 3: Anomaly 0.87 */}
              <div
                className="sonar-bbox sonar-bbox--anomaly"
                style={{ left: '83%', top: '32%', width: '7%', height: '9%' }}
                onClick={() => setSelectedDetectionId('det_hero_03')}
              >
                <span className="sonar-bbox__tag">Anomaly 0.87</span>
                <div className="bbox-corner tl" />
                <div className="bbox-corner tr" />
                <div className="bbox-corner bl" />
                <div className="bbox-corner br" />
              </div>

              {/* Top-Right Floating Telemetry: Survey Area */}
              <div className="survey-card">
                <div className="survey-card__header">
                  <span className="survey-icon">🗺️</span>
                  <span className="survey-title">Survey Area</span>
                  <span className="survey-arrow">&rsaquo;</span>
                </div>
                <div className="survey-card__grid">
                  <div className="survey-row">
                    <span className="survey-label">Area Scanned</span>
                    <span className="survey-val">2.4 km&sup2;</span>
                  </div>
                  <div className="survey-row">
                    <span className="survey-label">Detections</span>
                    <span className="survey-val">16</span>
                  </div>
                  <div className="survey-row">
                    <span className="survey-label">Debris</span>
                    <span className="survey-val">12</span>
                  </div>
                  <div className="survey-row">
                    <span className="survey-label">Anomalies</span>
                    <span className="survey-val">4</span>
                  </div>
                  <div className="survey-row">
                    <span className="survey-label">Confidence</span>
                    <span className="survey-val survey-val--accent">94.7%</span>
                  </div>
                </div>
              </div>

              {/* Bottom-Right Compass Rose HUD */}
              <div className="compass-hud">
                <svg width="60" height="60" viewBox="0 0 100 100" className="compass-svg">
                  <circle cx="50" cy="50" r="45" fill="rgba(10, 16, 26, 0.7)" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2,4" />
                  <circle cx="50" cy="50" r="3" fill="#fbbf24" />
                  <line x1="50" y1="12" x2="50" y2="88" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.5" />
                  <line x1="12" y1="50" x2="88" y2="50" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.5" />
                  <polygon points="50,15 46,28 54,28" fill="#fbbf24" />
                  <text x="50" y="10" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="bold">N</text>
                  <text x="94" y="53" textAnchor="middle" fill="#d97706" fontSize="9">E</text>
                  <text x="50" y="97" textAnchor="middle" fill="#d97706" fontSize="9">S</text>
                  <text x="7" y="53" textAnchor="middle" fill="#d97706" fontSize="9">W</text>
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 3. METRIC TELEMETRY CARDS ================= */}
        <section className="metrics-row">
          {/* Card 1: Marine Debris */}
          <div className="metric-card">
            <div className="metric-card__header">
              <div className="metric-icon metric-icon--cube">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <span className="metric-title">MARINE DEBRIS</span>
            </div>
            <div className="metric-card__body">
              <div className="metric-primary">
                <span className="metric-number">87</span>
                <span className="metric-unit">Detected</span>
              </div>
              <div className="metric-trend">
                <svg width="44" height="18" viewBox="0 0 50 20">
                  <path d="M0,15 Q15,5 25,12 T50,4" fill="none" stroke="#f59e0b" strokeWidth="2" />
                </svg>
                <span className="trend-stat">92.4%</span>
                <span className="trend-label">Avg. Confidence</span>
              </div>
            </div>
          </div>

          {/* Card 2: Anomalies */}
          <div className="metric-card">
            <div className="metric-card__header">
              <div className="metric-icon metric-icon--target">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" />
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                </svg>
              </div>
              <span className="metric-title">ANOMALIES</span>
            </div>
            <div className="metric-card__body">
              <div className="metric-primary">
                <span className="metric-number">23</span>
                <span className="metric-unit">Detected</span>
              </div>
              <div className="metric-trend">
                <svg width="44" height="18" viewBox="0 0 50 20">
                  <path d="M0,18 Q15,10 30,12 T50,3" fill="none" stroke="#f87171" strokeWidth="2" />
                </svg>
                <span className="trend-stat trend-stat--red">81.7%</span>
                <span className="trend-label">Avg. Confidence</span>
              </div>
            </div>
          </div>

          {/* Card 3: Sonar Coverage */}
          <div className="metric-card">
            <div className="metric-card__header">
              <div className="metric-icon metric-icon--map">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
              </div>
              <span className="metric-title">SONAR COVERAGE</span>
            </div>
            <div className="metric-card__body metric-card__body--split">
              <div className="metric-primary">
                <span className="metric-number">14.8 km&sup2;</span>
                <span className="metric-unit">Analyzed</span>
              </div>
              <div className="sonar-mesh-graphic">
                <svg width="55" height="35" viewBox="0 0 60 40">
                  <path d="M5,35 Q15,10 25,25 T45,15 T55,35" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.7" />
                  <path d="M10,35 Q20,18 30,28 T50,22 T55,35" fill="none" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 4: Model Performance */}
          <div className="metric-card">
            <div className="metric-card__header">
              <div className="metric-icon metric-icon--chart">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <span className="metric-title">MODEL PERFORMANCE</span>
            </div>
            <div className="metric-card__body">
              <div className="perf-grid">
                <div className="perf-item">
                  <span className="perf-val">0.91</span>
                  <span className="perf-lbl">mAP</span>
                </div>
                <div className="perf-item">
                  <span className="perf-val">94.2%</span>
                  <span className="perf-lbl">Precision</span>
                </div>
                <div className="perf-item">
                  <span className="perf-val">89.7%</span>
                  <span className="perf-lbl">Recall</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 4. OUR APPROACH PIPELINE ================= */}
        <section className="approach-section">
          <div className="approach-header">
            <span className="approach-tag">OUR APPROACH</span>
            <h2 className="approach-title">From Sonar Data to Meaningful Insights</h2>
            <p className="approach-desc">
              A systematic pipeline combining sonar image processing and deep learning for accurate detection
              and classification of underwater objects.
            </p>
          </div>

          <div className="pipeline-flow">
            {/* Step 1 */}
            <div className="pipeline-node">
              <div className="pipeline-icon">🗄️</div>
              <span className="pipeline-label">Raw SSS Data</span>
            </div>
            <div className="pipeline-arrow">&rarr;</div>

            {/* Step 2 */}
            <div className="pipeline-node">
              <div className="pipeline-icon">📈</div>
              <span className="pipeline-label">Preprocessing</span>
            </div>
            <div className="pipeline-arrow">&rarr;</div>

            {/* Step 3 */}
            <div className="pipeline-node">
              <div className="pipeline-icon">▦</div>
              <span className="pipeline-label">Feature Extraction</span>
            </div>
            <div className="pipeline-arrow">&rarr;</div>

            {/* Step 4 */}
            <div className="pipeline-node">
              <div className="pipeline-icon">🧠</div>
              <span className="pipeline-label">AI Model</span>
            </div>
            <div className="pipeline-arrow">&rarr;</div>

            {/* Step 5 */}
            <div className="pipeline-node">
              <div className="pipeline-icon">🎯</div>
              <span className="pipeline-label">Detection &amp; Classification</span>
            </div>
            <div className="pipeline-arrow">&rarr;</div>

            {/* Step 6 */}
            <div className="pipeline-node">
              <div className="pipeline-icon">📋</div>
              <span className="pipeline-label">Research Output</span>
            </div>
          </div>
        </section>

        {/* ================= 5. SPLIT SECTION: EXAMPLES & IMPACT ================= */}
        <div className="split-section">
          {/* Left: Detection Examples */}
          <section className="examples-card">
            <div className="examples-card__header">
              <span className="section-title">DETECTION EXAMPLES</span>
              <button
                type="button"
                className="gallery-link"
                onClick={() => setIsDemoModalOpen(true)}
              >
                View Gallery &rarr;
              </button>
            </div>

            <div className="examples-grid">
              {/* Example 1: Shipwreck */}
              <div className="example-thumb" onClick={() => setIsDemoModalOpen(true)}>
                <div className="example-thumb__img-wrap">
                  <img src="./assets/sonar_shipwreck_scan.jpg" alt="Shipwreck" className="thumb-img" />
                  <div className="thumb-bbox" style={{ top: '25%', left: '30%', width: '40%', height: '45%' }} />
                </div>
                <div className="example-thumb__meta">
                  <span className="thumb-name">Shipwreck</span>
                  <span className="thumb-conf">(Confidence: 0.94)</span>
                </div>
              </div>

              {/* Example 2: Marine Debris */}
              <div className="example-thumb" onClick={() => setIsDemoModalOpen(true)}>
                <div className="example-thumb__img-wrap">
                  <img src="./assets/sonar_debris_thumbnail.jpg" alt="Marine Debris" className="thumb-img" />
                  <div className="thumb-bbox thumb-bbox--red" style={{ top: '25%', left: '30%', width: '45%', height: '45%' }} />
                </div>
                <div className="example-thumb__meta">
                  <span className="thumb-name">Marine Debris</span>
                  <span className="thumb-conf">(Confidence: 0.78)</span>
                </div>
              </div>

              {/* Example 3: Anomaly */}
              <div className="example-thumb" onClick={() => setIsDemoModalOpen(true)}>
                <div className="example-thumb__img-wrap">
                  <img src="./assets/sonar_anomaly_thumbnail.jpg" alt="Anomaly" className="thumb-img" />
                  <div className="thumb-bbox thumb-bbox--yellow" style={{ top: '25%', left: '20%', width: '50%', height: '50%' }} />
                </div>
                <div className="example-thumb__meta">
                  <span className="thumb-name">Anomaly</span>
                  <span className="thumb-conf">(Confidence: 0.87)</span>
                </div>
              </div>
            </div>
          </section>

          {/* Right: Our Impact */}
          <section className="impact-card">
            <div className="impact-card__header">
              <span className="section-title">OUR IMPACT</span>
            </div>

            <div className="impact-grid">
              {/* Feature 1 */}
              <div className="impact-item">
                <div className="impact-icon">🌱</div>
                <div className="impact-body">
                  <h4>Cleaner Oceans</h4>
                  <p>Helps in identifying and monitoring marine debris to protect marine ecosystems.</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="impact-item">
                <div className="impact-icon">🛡️</div>
                <div className="impact-body">
                  <h4>Efficient Monitoring</h4>
                  <p>Automates large-scale sonar data analysis, reducing human effort and time.</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="impact-item">
                <div className="impact-icon">🌐</div>
                <div className="impact-body">
                  <h4>Data-Driven Decisions</h4>
                  <p>Provides reliable insights for research, conservation and policy making.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ================= 6. INTERACTIVE RESEARCH PORTAL & LIVE DEMO MODAL ================= */}
      {isDemoModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDemoModalOpen(false)}>
          <div className="portal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="portal-modal__header">
              <div className="modal-title-group">
                <span className="modal-badge">LIVE RESEARCH PORTAL</span>
                <h3>Interactive Sonar Anomaly Detection &amp; WebSocket Telemetry</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsDemoModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="portal-modal__body">
              {/* File Dropzone Section */}
              <UploadDropzone
                onFileSelected={handleFileSelected}
                selectedFile={selectedFile}
                isProcessing={isProcessing}
                onStartDetection={handleStartDetection}
              />

              {/* Processing Stream Status */}
              {isProcessing && (
                <ProcessingStatus
                  stageMessage={stageMessage}
                  onCancel={handleCancelOperation}
                />
              )}

              {/* Error Banner */}
              {apiError && (
                <ErrorBanner
                  error={apiError}
                  onRetry={handleStartDetection}
                  onDismiss={() => setApiError(null)}
                />
              )}

              {/* Workspace Navigation Tabs */}
              <div className="workspace-tabs-row">
                <div className="workspace-tabs">
                  <button
                    type="button"
                    className={`tab-btn ${activeWorkspaceTab === 'viewer' ? 'tab-btn--active' : ''}`}
                    onClick={() => setActiveWorkspaceTab('viewer')}
                  >
                    🖼️ Sonar Viewer &amp; Overlays
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${activeWorkspaceTab === 'map' ? 'tab-btn--active' : ''}`}
                    onClick={() => setActiveWorkspaceTab('map')}
                  >
                    🧭 Geospatial Map (WGS84)
                  </button>
                </div>

                <div className="workspace-actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => setIsExportOpen(true)}
                  >
                    📥 Export Report ({detections.length})
                  </button>
                </div>
              </div>

              {/* Viewer & Results Grid */}
              <div className="workspace-split-view">
                <div className="workspace-main-panel">
                  {activeWorkspaceTab === 'viewer' ? (
                    <DetectionViewer
                      imageUrl={previewUrl || './assets/sonar_shipwreck_scan.jpg'}
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

                <div className="workspace-side-panel">
                  <ResultList
                    detections={detections}
                    selectedDetectionId={selectedDetectionId}
                    onSelectDetection={setSelectedDetectionId}
                    confidenceThreshold={confidenceThreshold}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Report Dialog */}
      {isExportOpen && (
        <ReportModal
          detections={detections}
          fileName={selectedFile?.name || 'sonar_survey_01'}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      {/* Historical Missions Dashboard */}
      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectJob={handleSelectHistoricalJob}
        currentJobId={activeJobId}
      />
    </div>
  )
}