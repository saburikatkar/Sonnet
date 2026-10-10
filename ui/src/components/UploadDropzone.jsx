import React, { useRef, useState } from 'react'
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from '../constants'

export default function UploadDropzone({ onFileSelected, selectedFile, isProcessing, onStartDetection }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [validationError, setValidationError] = useState(null)
  const fileInputRef = useRef(null)

  function validateFile(file) {
    if (!file) return false

    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setValidationError(`Unsupported file format (${ext}). Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`)
      return false
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      setValidationError(`File is too large (${sizeMB} MB). Maximum size is 250 MB.`)
      return false
    }

    setValidationError(null)
    return true
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragOver(false)
    if (isProcessing) return

    const file = e.dataTransfer.files?.[0]
    if (file && validateFile(file)) {
      onFileSelected(file)
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file && validateFile(file)) {
      onFileSelected(file)
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="upload-section">
      <div
        className={`dropzone ${isDragOver ? 'dropzone--drag-over' : ''} ${selectedFile ? 'dropzone--has-file' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={isProcessing}
        />

        <div className="dropzone__content">
          <div className="dropzone__icon">📁</div>
          {selectedFile ? (
            <div className="dropzone__selected-info">
              <span className="dropzone__filename">{selectedFile.name}</span>
              <span className="dropzone__filesize">{formatBytes(selectedFile.size)}</span>
              <p className="dropzone__hint">Click or drop another file to replace</p>
            </div>
          ) : (
            <div>
              <p className="dropzone__primary-text">
                Drag &amp; drop side-scan sonar image or raw log here
              </p>
              <p className="dropzone__secondary-text">
                Supports <strong>PNG, JPG, TIFF, XTF, JSF</strong> (up to 250MB)
              </p>
              <button type="button" className="btn btn--secondary btn--sm" disabled={isProcessing}>
                Browse Files
              </button>
            </div>
          )}
        </div>
      </div>

      {validationError && (
        <div className="validation-error">
          <span className="validation-error__icon">⚠️</span>
          <span>{validationError}</span>
        </div>
      )}

      {selectedFile && (
        <div className="upload-actions">
          <button
            type="button"
            className="btn btn--primary btn--lg"
            onClick={onStartDetection}
            disabled={isProcessing}
          >
            {isProcessing ? 'Analyzing...' : 'Run Anomaly Detection (POST /api/v1/detect)'}
          </button>
        </div>
      )}
    </div>
  )
}
