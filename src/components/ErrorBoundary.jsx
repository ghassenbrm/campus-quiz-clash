import React from 'react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>Something went wrong</h2>
            <p>We're sorry, but an unexpected error occurred. Please try refreshing the page or come back later.</p>
            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginTop: '1rem' }}>
                <summary>Error details</summary>
                <pre style={{ whiteSpace: 'pre-wrap' }}>
                  {this.state.error?.toString()}
                </pre>
              </details>
            )}
            <div style={{ marginTop: '2rem' }}>
              <Link to="/" className="btn">
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
