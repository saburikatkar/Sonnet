/**
 * Team Synora Constants
 * Conforms to docs/api-contract.md and docs/ui-integration-checklist.md
 */

export const CLASS_TAXONOMY = [
  'plastic',
  'metal',
  'fishing_net',
  'tire',
  'shipwreck',
  'unknown'
]

export const MODEL_CLASSES = [
  'pipeline',
  'shipwreck',
  'mine_cylinder',
  'ghost_net',
  'crab_pot',
]

export const CLASS_META = {
  // Model native classes
  pipeline: {
    label: 'Subsea Pipeline / Conduit',
    color: '#bc8cff', // Purple
    severity: 'Medium',
    description: 'Submerged pipeline, industrial manifold, or linear metal structure',
  },
  mine_cylinder: {
    label: 'Cylindrical Anomaly / UXO',
    color: '#f85149', // Red / Critical
    severity: 'Critical',
    description: 'Cylindrical acoustic target, ordnance hazard, or high-risk cylinder',
  },
  ghost_net: {
    label: 'Ghost Fishing Gear',
    color: '#58a6ff', // Marine blue
    severity: 'Critical',
    description: 'Abandoned synthetic net or longline endangering marine ecosystems',
  },
  crab_pot: {
    label: 'Crab Pot / Trap Debris',
    color: '#d29922', // Amber / orange
    severity: 'Medium',
    description: 'Derelict commercial trap, cage structure, or benthic hazard',
  },
  // Unified taxonomy & aliases
  plastic: {
    label: 'Plastic Debris',
    color: '#f85149', // Vibrant red / high risk
    severity: 'High',
    description: 'Synthetic polymers, discarded containers, bags',
  },
  metal: {
    label: 'Metallic Structure',
    color: '#bc8cff', // Purple
    severity: 'Medium',
    description: 'Industrial containers, discarded pipelines, scrap metal',
  },
  fishing_net: {
    label: 'Ghost Fishing Gear',
    color: '#58a6ff', // Marine blue
    severity: 'Critical',
    description: 'Abandoned nets, lines, and ropes endangering marine life',
  },
  tire: {
    label: 'Tire / Rubber',
    color: '#d29922', // Amber / orange
    severity: 'Medium',
    description: 'Rubber tires, synthetic fender debris',
  },
  shipwreck: {
    label: 'Shipwreck / Vessel',
    color: '#f0883e', // Orange / brown
    severity: 'Low',
    description: 'Submerged hulls, historical wreckage, navigation hazard',
  },
  unknown: {
    label: 'Acoustic Anomaly',
    color: '#8b949e', // Gray / silver
    severity: 'Unclassified',
    description: 'Unidentified acoustic shadow or high-backscatter target',
  },
}

export function getClassMeta(className) {
  if (!className) return CLASS_META.unknown
  const key = String(className).toLowerCase()
  return CLASS_META[key] || CLASS_META.unknown
}

export const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.tiff', '.xtf', '.jsf']
export const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024 // 250 MB
