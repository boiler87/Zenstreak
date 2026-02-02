import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const VERSION = "3.8.0";

// --- SERVICE WORKER REGISTRATION ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log(`[Streaker v${VERSION}] SW Registered:`, registration.scope);
        
        // Check for updates
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker == null) return;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New content is available; please refresh.');
              } else {
                console.log('Content is cached for offline use.');
              }
            }
          };
        };
      })
      .catch(error => {
        console.warn(`[Streaker v${VERSION}] SW Registration Failed:`, error.message);
      });
  });

  // Reload page when a new service worker takes control
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      window.location.reload();
      refreshing = true;
    }
  });
}

// Global Error Handler
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes("API key")) {
    console.error("CRITICAL: API KEY ERROR DETECTED", event.reason);
  }
});

console.log(`%c Streaker v${VERSION} `, "background: #d4af37; color: #000000; font-weight: bold; padding: 4px;");

const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = '<div style="color:red; padding:20px;">CRITICAL ERROR: Root element not found.</div>';
  throw new Error("Root not found");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e) {
  console.error("React Mount Failed:", e);
  // Fallback UI if React crashes immediately
  rootElement.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:sans-serif;color:#64748b;">
    <h1 style="color:#ef4444;margin-bottom:10px;">System Malfunction</h1>
    <p>The application failed to initialize.</p>
    <p style="font-size:12px;margin-top:20px;opacity:0.7;">v${VERSION}</p>
    <button onclick="window.location.reload()" style="margin-top:20px;padding:10px 20px;background:#d4af37;border:none;border-radius:8px;color:white;font-weight:bold;cursor:pointer;">Reload System</button>
  </div>`;
}