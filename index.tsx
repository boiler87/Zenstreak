import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const VERSION = "3.6.7";

// --- SERVICE WORKER REGISTRATION ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Using a simple relative path is most robust across different preview/sandboxed environments.
    // We wrap it in a try-catch to prevent any registration errors from stopping the main thread.
    try {
      navigator.serviceWorker.register('sw.js')
        .then(registration => {
          console.log(`[Streaker v${VERSION}] SW Registered:`, registration.scope);
        })
        .catch(error => {
          // Log as warning rather than error to avoid cluttering consoles in restricted origins
          console.warn(`[Streaker v${VERSION}] SW Registration Failed (PWA offline features disabled):`, error.message);
        });
    } catch (err) {
      console.warn(`[Streaker v${VERSION}] SW Registration blocked by environment:`, err);
    }
  });
}

// Global Error Handler for API keys
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes("API key")) {
    console.error("CRITICAL: API KEY ERROR DETECTED", event.reason);
  }
});

console.log(`%c Streaker v${VERSION} `, "background: #d4af37; color: #000000; font-weight: bold; padding: 4px;");

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root not found");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);