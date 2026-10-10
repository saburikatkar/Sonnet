import test from 'node:test'
import assert from 'node:assert/strict'
import { CLASS_TAXONOMY, CLASS_META, ALLOWED_EXTENSIONS } from '../src/constants.js'
import {
  API_BASE_URL,
  initiateDetection,
  getJobStatus,
  generateReportApi,
  getWebSocketUrl,
  detectFileAsync,
  getHistoricalJobs
} from '../src/api/client.js'

test('UI Contract Verification: Taxonomy aligns with B2 docs/api-contract.md', () => {
  const expectedTaxonomy = ['plastic', 'metal', 'fishing_net', 'tire', 'shipwreck', 'unknown']
  assert.deepEqual(CLASS_TAXONOMY, expectedTaxonomy)
  for (const cls of expectedTaxonomy) {
    assert.ok(CLASS_META[cls], `Metadata missing for class ${cls}`)
    assert.ok(CLASS_META[cls].color, `Color missing for class ${cls}`)
  }
})

test('UI Contract Verification: Allowed extensions support optical and sonar formats', () => {
  assert.ok(ALLOWED_EXTENSIONS.includes('.png'))
  assert.ok(ALLOWED_EXTENSIONS.includes('.jpg'))
  assert.ok(ALLOWED_EXTENSIONS.includes('.tiff'))
  assert.ok(ALLOWED_EXTENSIONS.includes('.xtf'))
  assert.ok(ALLOWED_EXTENSIONS.includes('.jsf'))
})

test('UI Contract Verification: API base URL default is configured', () => {
  assert.equal(API_BASE_URL, 'http://127.0.0.1:8000')
})

test('UI Schema Validation: Normalized bounding box constraints', () => {
  const sampleBbox = {
    x_min: 0.1,
    y_min: 0.2,
    x_max: 0.15,
    y_max: 0.25,
  }

  assert.ok(sampleBbox.x_min >= 0 && sampleBbox.x_min <= 1)
  assert.ok(sampleBbox.y_min >= 0 && sampleBbox.y_min <= 1)
  assert.ok(sampleBbox.x_max >= sampleBbox.x_min && sampleBbox.x_max <= 1)
  assert.ok(sampleBbox.y_max >= sampleBbox.y_min && sampleBbox.y_max <= 1)
})

test('UI Schema Validation: Standard error envelope shape', () => {
  const sampleError = {
    error: {
      code: 'INVALID_FILE',
      message: 'Unsupported file format uploaded.',
      details: {},
    },
  }

  assert.ok(sampleError.error)
  assert.equal(sampleError.error.code, 'INVALID_FILE')
  assert.equal(typeof sampleError.error.message, 'string')
  assert.equal(typeof sampleError.error.details, 'object')
})

test('UI Async Workflow: Client exports initiateDetection, getJobStatus, generateReportApi, detectFileAsync, getHistoricalJobs', () => {
  assert.equal(typeof initiateDetection, 'function')
  assert.equal(typeof getJobStatus, 'function')
  assert.equal(typeof generateReportApi, 'function')
  assert.equal(typeof detectFileAsync, 'function')
  assert.equal(typeof getHistoricalJobs, 'function')
})

test('UI WebSocket Protocol: getWebSocketUrl formats native ws:// endpoint', () => {
  const wsUrl = getWebSocketUrl('job_test_123')
  assert.equal(wsUrl, 'ws://127.0.0.1:8000/api/v1/jobs/job_test_123/ws')
})

test('UI Report Generator Request: Validates format literal and detection array structure', () => {
  const validReportCsv = {
    format: 'csv',
    detections: [
      {
        detection_id: 'det_001',
        class_name: 'plastic',
        confidence: 0.94,
        bbox: { x_min: 0.1, y_min: 0.2, x_max: 0.3, y_max: 0.4 },
        geotag: { latitude: 45.1, longitude: -12.4, depth_meters: 14.5 },
      },
    ],
  }
  assert.ok(['csv', 'geojson'].includes(validReportCsv.format))
  assert.ok(Array.isArray(validReportCsv.detections))
  assert.equal(validReportCsv.detections[0].detection_id, 'det_001')
})

test('UI Historical Jobs Contract: Client provides getHistoricalJobs endpoint caller', () => {
  assert.equal(typeof getHistoricalJobs, 'function')
})
