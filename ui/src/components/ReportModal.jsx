import React, { useState } from 'react'

export default function ReportModal({ detections = [], fileName = 'scan', onClose }) {
  const [exportFormat, setExportFormat] = useState('csv')

  function handleDownload() {
    const baseName = fileName.replace(/\.[^/.]+$/, '')
    let content = ''
    let mimeType = 'text/plain'
    let extension = 'txt'

    if (exportFormat === 'csv') {
      const headers = [
        'detection_id',
        'class_name',
        'confidence',
        'latitude',
        'longitude',
        'depth_meters',
        'bbox_x_min',
        'bbox_y_min',
        'bbox_x_max',
        'bbox_y_max',
      ]
      const rows = detections.map((d) => [
        d.detection_id,
        d.class_name,
        d.confidence,
        d.geotag?.latitude ?? '',
        d.geotag?.longitude ?? '',
        d.geotag?.depth_meters ?? '',
        d.bbox?.x_min ?? '',
        d.bbox?.y_min ?? '',
        d.bbox?.x_max ?? '',
        d.bbox?.y_max ?? '',
      ])
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      mimeType = 'text/csv;charset=utf-8;'
      extension = 'csv'
    } else if (exportFormat === 'geojson') {
      const features = detections.map((d) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [d.geotag?.longitude ?? 0, d.geotag?.latitude ?? 0],
        },
        properties: {
          detection_id: d.detection_id,
          class_name: d.class_name,
          confidence: d.confidence,
          depth_meters: d.geotag?.depth_meters ?? null,
          bbox: d.bbox,
        },
      }))
      const geojson = {
        type: 'FeatureCollection',
        crs: {
          type: 'name',
          properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
        },
        features,
      }
      content = JSON.stringify(geojson, null, 2)
      mimeType = 'application/geo+json;charset=utf-8;'
      extension = 'geojson'
    } else {
      content = JSON.stringify(detections, null, 2)
      mimeType = 'application/json;charset=utf-8;'
      extension = 'json'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `synora_report_${baseName}_${new Date().toISOString().slice(0, 10)}.${extension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Export Inspection Report</h3>
          <button type="button" className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-text">
            Export {detections.length} anomaly detections for external GIS analysis, archival, or reporting.
          </p>

          <div className="format-options">
            <label className={`format-option ${exportFormat === 'csv' ? 'format-option--selected' : ''}`}>
              <input
                type="radio"
                name="format"
                value="csv"
                checked={exportFormat === 'csv'}
                onChange={() => setExportFormat('csv')}
              />
              <div className="format-option__content">
                <strong>CSV Spreadsheet (.csv)</strong>
                <span>Tabular data with coordinates, confidence scores, and bounding boxes.</span>
              </div>
            </label>

            <label className={`format-option ${exportFormat === 'geojson' ? 'format-option--selected' : ''}`}>
              <input
                type="radio"
                name="format"
                value="geojson"
                checked={exportFormat === 'geojson'}
                onChange={() => setExportFormat('geojson')}
              />
              <div className="format-option__content">
                <strong>GeoJSON Layer (.geojson)</strong>
                <span>WGS84 spatial features ready for QGIS, ArcGIS, or Leaflet.</span>
              </div>
            </label>

            <label className={`format-option ${exportFormat === 'json' ? 'format-option--selected' : ''}`}>
              <input
                type="radio"
                name="format"
                value="json"
                checked={exportFormat === 'json'}
                onChange={() => setExportFormat('json')}
              />
              <div className="format-option__content">
                <strong>Raw JSON Summary (.json)</strong>
                <span>Direct schema export conforming to B2 API specification.</span>
              </div>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={handleDownload}>
            Download Export
          </button>
        </div>
      </div>
    </div>
  )
}
