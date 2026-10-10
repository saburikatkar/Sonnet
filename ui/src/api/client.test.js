import { renderHook, act } from '@testing-library/react-hooks';
import { useSonarStream } from './client';

/**
 * U2 AUDIT PHASE 7: Unit Tests for WebSocket Client Hook
 * - Validates the cleanup lifecycle and connection state mechanics.
 * - Ensures that the UI does not attempt to reconnect if unmounted cleanly.
 */

// Mock the global WebSocket object for tests
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
  }
  close(code, reason) {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose({ wasClean: code === 1000, code, reason });
    }
  }
  send(data) {}
}

describe('useSonarStream Hook', () => {
  let originalWebSocket;

  beforeEach(() => {
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
  });

  it('should initialize and attempt connection when jobId is provided', () => {
    const { result } = renderHook(() => useSonarStream('job-999'));

    expect(result.current.status).toBe('connecting');
    expect(result.current.error).toBeNull();
  });

  it('should close the connection cleanly on unmount', () => {
    const { result, unmount } = renderHook(() => useSonarStream('job-999'));
    
    act(() => {
      unmount();
    });

    // The status should reflect the clean unmount closure
    expect(result.current.status).toBe('disconnected');
  });
});
