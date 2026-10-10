import React from 'react';

/**
 * U2 AUDIT:
 * - Global Error Boundary wrapper for React components.
 * - Catches JavaScript errors anywhere in their child component tree,
 *   logs those errors, and displays a fallback UI instead of crashing the Electron shell.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // In a real production app, we would log this to Sentry or a local log file via IPC
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Attempt IPC log if available
    if (window.electronAPI && window.electronAPI.send) {
      try {
        window.electronAPI.send('log-client-error', { error: error.toString(), info: errorInfo });
      } catch (e) {
        console.warn('Failed to send error via IPC', e);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <h2 style={styles.header}>⚠️ Application Error Detected</h2>
          <p style={styles.text}>The marine debris UI encountered an unexpected error and recovered gracefully.</p>
          <details style={styles.details}>
            <summary>Error Details</summary>
            <pre style={styles.pre}>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </details>
          <button 
            style={styles.button}
            onClick={() => window.location.reload()}
          >
            Restart Application
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

const styles = {
  container: {
    padding: '2rem',
    background: '#11111b',
    color: '#f38ba8',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'sans-serif'
  },
  header: {
    margin: '0 0 1rem 0'
  },
  text: {
    color: '#cdd6f4',
    marginBottom: '1rem'
  },
  details: {
    background: '#181825',
    padding: '1rem',
    borderRadius: '8px',
    maxWidth: '80%',
    overflowX: 'auto',
    textAlign: 'left',
    marginBottom: '2rem'
  },
  pre: {
    fontSize: '0.85rem',
    color: '#a6adc8',
    whiteSpace: 'pre-wrap'
  },
  button: {
    padding: '0.75rem 1.5rem',
    background: '#89b4fa',
    color: '#11111b',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};
