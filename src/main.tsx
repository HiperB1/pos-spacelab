// Debug logging - capture errors before React loads
window.onerror = (message, source, lineno, colno, error) => {
  console.error('[RUNTIME ERROR]', { message, source, lineno, colno, error: error?.stack });
  return false;
};

window.onunhandledrejection = (event) => {
  console.error('[UNHANDLED REJECTION]', event.reason);
};

console.log('[INIT] Starting app...');

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

console.log('[INIT] Imports loaded');

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(e: Error) {
    console.error('[ERROR BOUNDARY]', e);
    return { error: e.message + '\n' + e.stack };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#0a0a1a', color: '#fff', padding: '2rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '12px' }}>
          <strong style={{ color: '#f87171' }}>Error de aplicación:</strong>{'\n\n'}
          {this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

console.log('[INIT] Rendering app...');

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

console.log('[INIT] App rendered successfully');