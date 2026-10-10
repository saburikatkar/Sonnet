/**
 * Team Synora – TARANG Mock & Telemetry Data
 * Matches Image 2 UI specification exactly
 */

export const MOCK_NAVIGATION = {
  latitude:  43.06123,
  longitude: -70.71524,
  heading:   354.8,
  depth:     18.2,
  altitude:  3.2,
  speed:     2.1,
  course:    355,
  layback:   8,
  freq:      780,
  temp:      12.9,
  ping:      216,
  range:     100,
  dgpsFix:   true,
}

export const MOCK_SURVEY_PLAN = {
  totalLines:    5,
  spacing:       50,
  totalKm:       3.2,
  currentLine:   2,
  distToEnd:     420,
  estTime:       '00:18:36',
}

export const MOCK_LAYERS = [
  { id: 'rov-track',    label: 'Vessel / ROV Track',        enabled: true,  opacity: 100, group: 'operational' },
  { id: 'survey-lines', label: 'Survey Lines',              enabled: true,  opacity: 85,  group: 'operational' },
  { id: 'targets',      label: 'Targets',                   enabled: true,  opacity: 100, group: 'operational' },
  { id: 'hydro-chart',  label: 'Vector Hydrographic Chart', enabled: true,  opacity: 70,  group: 'background'  },
  { id: 'bathymetry',   label: 'Bathymetric Iso-contours',  enabled: true,  opacity: 60,  group: 'background'  },
]

export const DEFAULT_SONAR_IMAGE = new URL('../assets/sonar_shipwreck_scan.jpg', import.meta.url).href

export const MOCK_TARGETS = [
  {
    id: 'TRK-001',
    type: 'shipwreck',
    class: 'Submerged Vessel Wreck',
    modelScore: 0.566,
    roi: 'port',
    timeS: '00:14.2',
    frame: 'F-0428',
    status: 'Operator accepted',
    bbox: { x_min: 0.2285, y_min: 0.4020, x_max: 0.4602, y_max: 0.5769 },
    side: 'port',
    confidence: 0.566,
    thumbnailUrl: new URL('../assets/target_trk001_shipwreck.jpg', import.meta.url).href,
  },
  {
    id: 'TRK-002',
    type: 'shipwreck',
    class: 'Debris Field / Hull Cluster',
    modelScore: 0.542,
    roi: 'starboard',
    timeS: '00:18.5',
    frame: 'F-0482',
    status: 'Detected',
    bbox: { x_min: 0.5458, y_min: 0.3664, x_max: 0.8260, y_max: 0.5652 },
    side: 'starboard',
    confidence: 0.542,
    thumbnailUrl: new URL('../assets/target_trk002_shipwreck.jpg', import.meta.url).href,
  },
  {
    id: 'TRK-003',
    type: 'crab_pot',
    class: 'Benthic Trap / Cage',
    modelScore: 0.647,
    roi: 'starboard',
    timeS: '00:22.1',
    frame: 'F-0514',
    status: 'Operator accepted',
    bbox: { x_min: 0.8715, y_min: 0.2912, x_max: 0.8888, y_max: 0.3207 },
    side: 'starboard',
    confidence: 0.647,
    thumbnailUrl: new URL('../assets/target_trk003_crabpot.jpg', import.meta.url).href,
  },
  {
    id: 'TRK-004',
    type: 'ghost_net',
    class: 'Derelict Fishing Gear',
    modelScore: 0.291,
    roi: 'port',
    timeS: '00:09.8',
    frame: 'F-0312',
    status: 'Pending Review',
    bbox: { x_min: 0.1096, y_min: 0.1667, x_max: 0.2122, y_max: 0.2683 },
    side: 'port',
    confidence: 0.291,
    thumbnailUrl: new URL('../assets/target_trk004_ghostnet.jpg', import.meta.url).href,
  },
  {
    id: 'TRK-005',
    type: 'mine_cylinder',
    class: 'Cylindrical Anomaly',
    modelScore: 0.249,
    roi: 'starboard',
    timeS: '00:29.4',
    frame: 'F-0620',
    status: 'Detected',
    bbox: { x_min: 0.8429, y_min: 0.7193, x_max: 0.8621, y_max: 0.7510 },
    side: 'starboard',
    confidence: 0.249,
    thumbnailUrl: new URL('../assets/target_trk005_minecylinder.jpg', import.meta.url).href,
  },
]

export const MOCK_SURVEY_LINES = [
  { id: 1, start: [60, 40],  end: [200, 40]  },
  { id: 2, start: [60, 70],  end: [200, 70]  },
  { id: 3, start: [60, 100], end: [200, 100] },
  { id: 4, start: [60, 130], end: [200, 130] },
  { id: 5, start: [60, 160], end: [200, 160] },
]

export const MOCK_ROV_TRACK = [
  [180, 220], [175, 200], [172, 180], [170, 160],
  [165, 140], [160, 120], [158, 100], [155, 80],
  [150, 60],  [148, 45],
]

export const STATUS_OPTIONS = ['Detected', 'Operator accepted', 'False Positive', 'Pending Review']

export const COLOR_MAPS = ['MytisBronze', 'MultiBronze', 'Greyscale', 'Hot', 'Copper', 'Jet', 'Rainbow']
