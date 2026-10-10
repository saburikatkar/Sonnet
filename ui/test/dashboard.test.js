import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Dashboard Edge Cases: HistoryPanel handles loading states', () => {
  const panelPath = path.join(process.cwd(), 'src', 'components', 'HistoryPanel.jsx')
  const content = fs.readFileSync(panelPath, 'utf8')
  assert.ok(content.includes('isLoading'), 'HistoryPanel must have isLoading state')
  assert.ok(content.includes('history-loading-state'), 'HistoryPanel must render a loading state UI')
})

test('Dashboard Edge Cases: HistoryPanel handles empty data gracefully', () => {
  const panelPath = path.join(process.cwd(), 'src', 'components', 'HistoryPanel.jsx')
  const content = fs.readFileSync(panelPath, 'utf8')
  assert.ok(content.includes('history-empty-state'), 'HistoryPanel must render an empty state UI')
  assert.ok(content.includes('filteredJobs.length === 0'), 'HistoryPanel must handle zero jobs case')
})

test('Dashboard Edge Cases: HistoryPanel CSS incorporates Flexbox for responsiveness', () => {
  const cssPath = path.join(process.cwd(), 'src', 'App.css')
  const content = fs.readFileSync(cssPath, 'utf8')
  
  assert.ok(content.includes('display: flex') || content.includes('display:flex'), 'Flexbox must be used for UI layouts')
})

test('Deep Audit: ResultList does not mutate filtered array (uses spread before sort)', () => {
  const src = path.join(process.cwd(), 'src', 'components', 'ResultList.jsx')
  const content = fs.readFileSync(src, 'utf8')
  // Must use [...filtered].sort() not filtered.sort()
  assert.ok(content.includes('[...filtered].sort'), 'ResultList must copy array before sorting to avoid mutation')
})

test('Deep Audit: GeospatialMap uses unique SVG pattern id via useId()', () => {
  const src = path.join(process.cwd(), 'src', 'components', 'GeospatialMap.jsx')
  const content = fs.readFileSync(src, 'utf8')
  assert.ok(content.includes('useId'), 'GeospatialMap must use useId() for unique SVG pattern id')
  assert.ok(!content.includes('id="grid"'), 'GeospatialMap must not use hardcoded id="grid"')
})

test('Deep Audit: ProcessingStatus has aria-live region for accessibility', () => {
  const src = path.join(process.cwd(), 'src', 'components', 'ProcessingStatus.jsx')
  const content = fs.readFileSync(src, 'utf8')
  assert.ok(content.includes('aria-live'), 'ProcessingStatus must have aria-live for screen reader announcements')
  assert.ok(content.includes('aria-busy'), 'ProcessingStatus must have aria-busy')
})

test('Deep Audit: App.css defines all btn variant classes used in components', () => {
  const cssPath = path.join(process.cwd(), 'src', 'App.css')
  const content = fs.readFileSync(cssPath, 'utf8')
  for (const cls of ['btn--primary', 'btn--secondary', 'btn--danger', 'btn--sm', 'btn--xs', 'btn--lg']) {
    assert.ok(content.includes(cls), `App.css must define .${cls}`)
  }
})

test('Deep Audit: App.css defines health-indicator--degraded state', () => {
  const cssPath = path.join(process.cwd(), 'src', 'App.css')
  const content = fs.readFileSync(cssPath, 'utf8')
  assert.ok(content.includes('health-indicator--degraded'), 'App.css must define .health-indicator--degraded')
})
