/**
 * Team Synora – TARANG Mock Data
 * TODO: replace all exports with live backend / WebSocket data
 */

// TODO: replace with live WebSocket navigation telemetry
export const MOCK_NAVIGATION = {
  latitude:  45.0612,
  longitude: -78.7528,
  heading:   354.8,
  depth:     18.2,
  altitude:  3.2,
  speed:     1.2,
  course:    270,
  layback:   8,
  freq:      780,
  temp:      12.9,
  ping:      216,
  range:     25,
}

// TODO: replace with live survey plan from backend
export const MOCK_SURVEY_PLAN = {
  totalLines:    6,
  spacing:       50,
  totalKm:       3.2,
  currentLine:   2,
  distToEnd:     428,
  estTime:       '00:15:36',
}

// TODO: replace with live map layer config from backend
export const MOCK_LAYERS = [
  { id: 'rov-track',   label: 'Vessel / ROV Track',        enabled: true,  opacity: 100, group: 'operational' },
  { id: 'survey-lines',label: 'Survey Lines',               enabled: true,  opacity: 85,  group: 'operational' },
  { id: 'targets',     label: 'Targets',                    enabled: true,  opacity: 100, group: 'operational' },
  { id: 'hydro-chart', label: 'Vector Hydrographic Chart',  enabled: true,  opacity: 79,  group: 'background'  },
  { id: 'bathymetry',  label: 'Bathymetric bp-contour',     enabled: false, opacity: 60,  group: 'background'  },
]

// TODO: replace with live target detections from backend WebSocket
export const MOCK_TARGETS = [
  {
    id: 'TRK-071',
    type: 'sonar',
    class: 'Sonar target',
    modelScore: 0.523,
    roi: 'port',
    timeS: '00:22.6',
    frame: 'F-478',
    status: 'Detected',
    bbox: { x: 0.24, y: 0.28, w: 0.08, h: 0.22 },
    side: 'port',
    confidence: 0.523,
  },
  {
    id: 'TRK-082',
    type: 'sonar',
    class: 'Sonar target',
    modelScore: 0.321,
    roi: 'port',
    timeS: '00:28.4',
    frame: 'F-452',
    status: 'Detected',
    bbox: { x: 0.12, y: 0.44, w: 0.06, h: 0.18 },
    side: 'port',
    confidence: 0.321,
  },
  {
    id: 'TRK-083',
    type: 'sonar',
    class: 'Sonar target',
    modelScore: 0.825,
    roi: 'starboard',
    timeS: '00:31.6',
    frame: 'F-468',
    status: 'Operator accepted',
    bbox: { x: 0.63, y: 0.22, w: 0.05, h: 0.16 },
    side: 'starboard',
    confidence: 0.825,
  },
  {
    id: 'TRK-087',
    type: 'sonar',
    class: 'Sonar target',
    modelScore: 0.684,
    roi: 'starboard',
    timeS: '00:27.8',
    frame: 'F-534',
    status: 'Detected',
    bbox: { x: 0.70, y: 0.38, w: 0.04, h: 0.14 },
    side: 'starboard',
    confidence: 0.684,
  },
  {
    id: 'TRK-098',
    type: 'sonar',
    class: 'Sonar target',
    modelScore: 0.875,
    roi: 'port',
    timeS: '00:42.0',
    frame: 'F-1308',
    status: 'Detected',
    bbox: { x: 0.18, y: 0.62, w: 0.07, h: 0.20 },
    side: 'port',
    confidence: 0.875,
  },
]

export const MOCK_SURVEY_LINES = [
  { id: 1, start: [60, 40],  end: [200, 40]  },
  { id: 2, start: [60, 70],  end: [200, 70]  },
  { id: 3, start: [60, 100], end: [200, 100] },
  { id: 4, start: [60, 130], end: [200, 130] },
  { id: 5, start: [60, 160], end: [200, 160] },
  { id: 6, start: [60, 190], end: [200, 190] },
]

export const MOCK_ROV_TRACK = [
  [180, 220], [175, 200], [172, 180], [170, 160],
  [165, 140], [160, 120], [158, 100], [155, 80],
  [150, 60],  [148, 45],
]

export const STATUS_OPTIONS = ['Detected', 'Operator accepted', 'False Positive', 'Pending Review']

export const COLOR_MAPS = ['MultiBronze', 'Greyscale', 'Hot', 'Copper', 'Jet', 'Rainbow']
