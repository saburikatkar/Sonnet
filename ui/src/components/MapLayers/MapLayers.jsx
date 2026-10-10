import React from 'react'
import './MapLayers.css'

export default function MapLayers({ layers = [], onLayerChange }) {
  const operational = layers.filter(l => l.group === 'operational')
  const background = layers.filter(l => l.group === 'background')

  function toggleLayer(id) {
    onLayerChange?.(layers.map(l => l.id === id ? { ...l, enabled: !l.enabled } : l))
  }
  function setOpacity(id, val) {
    onLayerChange?.(layers.map(l => l.id === id ? { ...l, opacity: val } : l))
  }

  const LayerRow = ({ layer }) => (
    <div className={`ml-layer ${!layer.enabled ? 'ml-layer--off' : ''}`}>
      <label className="ml-layer__check">
        <input
          type="checkbox"
          checked={layer.enabled}
          onChange={() => toggleLayer(layer.id)}
        />
        <span className="ml-layer__name">{layer.label}</span>
      </label>
      <div className="ml-layer__opacity">
        <input
          type="range"
          className="ml-slider"
          min="0"
          max="100"
          value={layer.opacity}
          onChange={e => setOpacity(layer.id, +e.target.value)}
        />
        <span className="ml-opacity-val">{layer.opacity}%</span>
      </div>
    </div>
  )

  return (
    <div className="map-layers">
      <div className="map-layers__header">
        <span className="map-layers__title">MAP LAYERS</span>
        <span className="map-layers__badge">GIS Pro</span>
      </div>

      <div className="map-layers__body">
        <div className="ml-group-header">
          <span className="ml-group-label">OPERATIONAL OVERLAYS</span>
          <span className="ml-group-tag">FIXED</span>
        </div>
        {operational.map(l => <LayerRow key={l.id} layer={l} />)}

        <div className="ml-group-header" style={{ marginTop: '10px' }}>
          <span className="ml-group-label">BACKGROUND MAPS</span>
          <span className="ml-group-tag">STACK ORDER ▾</span>
        </div>
        {background.map(l => <LayerRow key={l.id} layer={l} />)}
      </div>
    </div>
  )
}
