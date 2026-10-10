/**
 * U2 AUDIT:
 * - Runtime validators to ensure payload shapes match frontend expectations.
 * - Prevents silent crashes when backend models (YOLOv11 FastAPI) change schemas.
 */

export function validateSonarFrame(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid SonarFrame payload: must be an object');
  }

  if (typeof payload.frameData !== 'string') {
    throw new Error('Invalid SonarFrame payload: frameData must be a base64 string');
  }

  if (!Array.isArray(payload.boundingBoxes)) {
    throw new Error('Invalid SonarFrame payload: boundingBoxes must be an array');
  }

  payload.boundingBoxes.forEach((box, index) => {
    if (
      typeof box.x !== 'number' ||
      typeof box.y !== 'number' ||
      typeof box.width !== 'number' ||
      typeof box.height !== 'number' ||
      typeof box.confidence !== 'number' ||
      typeof box.label !== 'string'
    ) {
      throw new Error(`Invalid BoundingBox at index ${index}: Malformed data shape`);
    }
  });

  return true;
}

export function validateHistoryItem(item) {
  if (!item || typeof item !== 'object') {
    return false;
  }
  return (
    typeof item.id === 'string' &&
    typeof item.type === 'string' &&
    typeof item.confidence === 'number' &&
    typeof item.timestamp === 'string' &&
    typeof item.lat === 'number' &&
    typeof item.lng === 'number'
  );
}
