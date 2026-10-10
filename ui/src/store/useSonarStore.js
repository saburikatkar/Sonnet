import { create } from 'zustand';

/**
 * U2 AUDIT:
 * - Centralized global state management using Zustand.
 * - Decouples WebSocket payload consumption from presentation components.
 * - Prevents deep prop-drilling across the Electron desktop shell.
 */
export const useSonarStore = create((set, get) => ({
  isStreaming: false,
  activeJobId: null,
  currentFrame: null,
  boundingBoxes: [],
  anomalyHistory: [],
  systemStatus: 'idle', // 'idle', 'connecting', 'live', 'error'

  setStreamingState: (isStreaming, jobId = null) => 
    set({ isStreaming, activeJobId: jobId, systemStatus: isStreaming ? 'live' : 'idle' }),

  updateSonarFeed: (frameData, boxes) => {
    // Only update if we are actively streaming to prevent rogue updates
    if (get().isStreaming) {
      set({ 
        currentFrame: frameData, 
        boundingBoxes: boxes 
      });
      
      // Auto-append high-confidence anomalies to local memory history buffer
      const highConfidence = boxes.filter(b => b.confidence > 0.85);
      if (highConfidence.length > 0) {
        set((state) => ({
          anomalyHistory: [...state.anomalyHistory, ...highConfidence].slice(-100) // Keep last 100
        }));
      }
    }
  },

  setSystemError: (errorMessage) => 
    set({ systemStatus: 'error', isStreaming: false }),

  clearSession: () => 
    set({
      isStreaming: false,
      activeJobId: null,
      currentFrame: null,
      boundingBoxes: [],
      systemStatus: 'idle'
    })
}));
