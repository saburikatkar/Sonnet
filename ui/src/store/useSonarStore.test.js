import { describe, it, expect, beforeEach } from 'vitest';
import { useSonarStore } from './useSonarStore';

/**
 * U2 AUDIT PHASE 7: Unit Tests for Global State Store
 * - Verifies that the UI state mutations are perfectly deterministic.
 * - Confirms that the anomaly history buffer selectively captures high-confidence YOLOv11 hits.
 */
describe('useSonarStore', () => {
  beforeEach(() => {
    useSonarStore.getState().clearSession();
  });

  it('should initialize with default idle state', () => {
    const state = useSonarStore.getState();
    expect(state.isStreaming).toBe(false);
    expect(state.systemStatus).toBe('idle');
    expect(state.anomalyHistory).toHaveLength(0);
  });

  it('should transition to live state when streaming starts', () => {
    useSonarStore.getState().setStreamingState(true, 'job-123');
    
    const state = useSonarStore.getState();
    expect(state.isStreaming).toBe(true);
    expect(state.activeJobId).toBe('job-123');
    expect(state.systemStatus).toBe('live');
  });

  it('should selectively append high-confidence anomalies to the history buffer', () => {
    // Start streaming
    useSonarStore.getState().setStreamingState(true, 'job-123');

    // Feed a mix of low and high confidence boxes
    const mockBoxes = [
      { id: 1, confidence: 0.90, label: 'Debris' }, // Should be kept
      { id: 2, confidence: 0.40, label: 'Fish' },   // Should be ignored
      { id: 3, confidence: 0.99, label: 'Mine' }    // Should be kept
    ];

    useSonarStore.getState().updateSonarFeed('mock-frame-base64', mockBoxes);

    const state = useSonarStore.getState();
    expect(state.currentFrame).toBe('mock-frame-base64');
    expect(state.boundingBoxes).toHaveLength(3);
    
    // Anomaly history should only contain the 2 high-confidence boxes (> 0.85)
    expect(state.anomalyHistory).toHaveLength(2);
    expect(state.anomalyHistory[0].id).toBe(1);
    expect(state.anomalyHistory[1].id).toBe(3);
  });

  it('should ignore frame updates if not actively streaming', () => {
    // Attempt update while idle
    useSonarStore.getState().updateSonarFeed('mock-frame', [{ id: 1, confidence: 0.9, label: 'Debris' }]);

    const state = useSonarStore.getState();
    expect(state.currentFrame).toBeNull();
    expect(state.anomalyHistory).toHaveLength(0);
  });
});
