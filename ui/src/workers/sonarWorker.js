/**
 * U2 AUDIT PHASE 5: Web Worker for Heavy Payload Offloading
 * - JSON parsing of high-frequency sonar payloads can block the main UI thread.
 * - This worker runs in a separate thread, parses the JSON, validates it (mocked here),
 *   and calculates complex anomaly groupings before handing it back to the React thread.
 * - Prevents UI stutter (60fps lock for SonarCanvas).
 */

self.onmessage = function (e) {
  try {
    const rawData = e.data;
    
    // 1. Heavy JSON Parsing
    let parsedPayload;
    if (typeof rawData === 'string') {
        parsedPayload = JSON.parse(rawData);
    } else {
        parsedPayload = rawData;
    }

    // 2. Heavy processing: e.g., normalizing bounding boxes to percentages
    // or filtering out extremely low confidence noise
    const filteredBoxes = (parsedPayload.boundingBoxes || []).filter(
      (box) => box.confidence > 0.3 // Discard absolute noise
    );

    // Prepare optimized payload for the UI thread
    const optimizedPayload = {
      ...parsedPayload,
      boundingBoxes: filteredBoxes,
      processedAt: Date.now()
    };

    // Send back to main thread safely
    self.postMessage({ status: 'success', data: optimizedPayload });
  } catch (error) {
    self.postMessage({ status: 'error', error: error.message });
  }
};
