import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Apollo Events Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif', background: '#F5F8FA', minHeight: '100vh' }}>
          <h2 style={{ color: '#064B6B' }}>The Apollo University Events Portal</h2>
          <p style={{ color: '#666' }}>An error occurred: {this.state.error?.message || 'Unexpected Error'}</p>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }} 
            style={{ padding: '10px 20px', background: '#FBB91B', color: '#12303D', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px' }}
          >
            Clear Cache & Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
