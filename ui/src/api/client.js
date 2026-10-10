import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom React hook for connecting to the Sonar Anomaly WebSocket stream.
 * Features: Automatic reconnection, cleanup on unmount, and error boundaries.
 * 
 * @param {string} jobId - The job ID to listen to.
 */
export function useSonarStream(jobId) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('disconnected'); // 'connecting', 'connected', 'disconnected', 'error'
  const [error, setError] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  // Track component mount status to avoid state updates on unmounted components
  const isMounted = useRef(false);

  const connect = useCallback(() => {
    if (!jobId) return;
    
    // Clear any pending reconnections
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (isMounted.current) setStatus('connecting');

    const wsUrl = `ws://127.0.0.1:8000/jobs/${jobId}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      setStatus('connected');
      setError(null);
    };

    ws.onmessage = (event) => {
      if (!isMounted.current) return;
      try {
        const payload = JSON.parse(event.data);
        setData(payload);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = (event) => {
      if (!isMounted.current) return;
      
      // Intentional close from the client (e.g. unmount) won't trigger reconnect
      if (event.wasClean) {
        setStatus('disconnected');
      } else {
        setStatus('error');
        // Exponential backoff or simple 3-second delay for reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          console.warn('Attempting to reconnect WebSocket...');
          connect();
        }, 3000);
      }
    };

    ws.onerror = (err) => {
      if (!isMounted.current) return;
      console.error('WebSocket encountered an error:', err);
      setError(new Error('WebSocket connection error.'));
      // The onclose event will typically follow onerror, where we handle the reconnect.
    };
  }, [jobId]);

  useEffect(() => {
    isMounted.current = true;
    
    if (jobId) {
      connect();
    }

    // Cleanup function
    return () => {
      isMounted.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (wsRef.current) {
        // Close intentionally
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
    };
  }, [connect, jobId]);

  // Method to manually send messages if needed
  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message, WebSocket is not open.');
    }
  }, []);

  return { data, status, error, sendMessage };
}
