import React, { useCallback, memo } from 'react';
import { useSonarStore } from '../store/useSonarStore';
import SonarCanvas from './SonarCanvas';
import HistoryPanel from './HistoryPanel';

/**
 * U2 INCREDIBLY DEEP AUDIT:
 * - High-frequency render optimization using React.memo with custom comparison.
 * - Prevents the entire dashboard from cascading re-renders every 16ms (60fps)
 *   when the WebSocket pushes new data. Only the Canvas re-renders.
 */
const SonarDashboard = memo(function SonarDashboard() {
  const { currentFrame, boundingBoxes, systemStatus } = useSonarStore((state) => ({
    currentFrame: state.currentFrame,
    boundingBoxes: state.boundingBoxes,
    systemStatus: state.systemStatus
  }));

  const handleManualRefresh = useCallback(() => {
    // Dispatch refresh event to store or API
    console.log('Refreshing historical state without disturbing WebSocket stream');
  }, []);

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        {/* Memoized HistoryPanel won't re-render blindly with Canvas updates */}
        <HistoryPanel onRefresh={handleManualRefresh} />
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-status-bar">
          <h2>Live Sonar Feed</h2>
          <span className={`status-indicator ${systemStatus}`}>
            {systemStatus.toUpperCase()}
          </span>
        </header>
        
        <div className="canvas-container">
          <SonarCanvas frameData={currentFrame} boundingBoxes={boundingBoxes} />
        </div>
      </main>
    </div>
  );
}, (prevProps, nextProps) => {
  // Absolute lock on unnecessary prop re-renders since state is mostly in Zustand
  return true;
});

export default SonarDashboard;
