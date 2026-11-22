import React from 'react';
import './error-boundary.css';

export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Saathi UI failed to render:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <main className="app-error" role="alert">
        <div className="error-card">
          <p className="eyebrow">SAATHI NEEDS A REFRESH</p>
          <h1>We couldn’t open this page.</h1>
          <p>Something went wrong while loading Saathi. Refresh the page to try again.</p>
          <details><summary>Technical details</summary><code>{this.state.error.message}</code></details>
          <button className="submit-button" onClick={() => window.location.reload()}>Refresh page</button>
        </div>
      </main>;
    }
    return this.props.children;
  }
}
