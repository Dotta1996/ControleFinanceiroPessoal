
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Register service worker for PWA securely (safely ignored in iframes / unsupported environments)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.self === window.top) {
  try {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('New content available — please refresh.');
      },
      onOfflineReady() {
        console.log('Offline ready');
      },
      onRegisterError(error: any) {
        console.warn('PWA service worker registration skipped or failed:', error);
      }
    });
  } catch (err) {
    console.warn('Could not register service worker:', err);
  }
}
