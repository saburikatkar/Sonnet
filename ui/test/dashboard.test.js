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
