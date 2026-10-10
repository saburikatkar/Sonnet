import { useEffect, useRef, useCallback } from 'react';

/**
 * U2 AUDIT PHASE 5: Custom hook to manage the Sonar Web Worker lifecycle.
 * - Ensures the worker is instantiated once.
 * - Enforces strict termination on unmount to prevent orphaned background threads and memory leaks.
 */
export function useSonarWorker(onDataProcessed) {
  const workerRef = useRef(null);

  useEffect(() => {
    // Instantiate worker
    workerRef.current = new Worker(new URL('../workers/sonarWorker.js', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (e) => {
      if (e.data.status === 'success') {
        onDataProcessed(e.data.data);
      } else {
        console.error('SonarWorker Processing Error:', e.data.error);
      }
    };

    workerRef.current.onerror = (err) => {
      console.error('SonarWorker Fatal Error:', err.message);
    };

    return () => {
      // Hard terminate worker on component unmount
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [onDataProcessed]);

  const processPayload = useCallback((rawPayload) => {
    if (workerRef.current) {
      workerRef.current.postMessage(rawPayload);
    }
  }, []);

  return { processPayload };
}
