import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- CRITICAL CACHE CLEARING (IMMEDIATE) ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      console.log('Unregistering SW:', registration);
      registration.unregister();
    }
  }).catch(function(error) {
    console.warn('Service Worker cleanup skipped:', error);
  });
}

// Global Error Handler for API keys
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes("API key")) {
    console.error("CRITICAL: API KEY ERROR DETECTED", event.reason);
  }
});

console.log("%c Streaker v1.6.1 ", "background: #0d9488; color: #ffffff; font-weight: bold; padding: 4px;");

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root not found");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);