import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- SERVICE WORKER REGISTRATION ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        console.log('SW Registered:', registration.scope);
      })
      .catch(error => {
        console.log('SW Registration Failed:', error);
      });
  });
}

// Global Error Handler for API keys
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes("API key")) {
    console.error("CRITICAL: API KEY ERROR DETECTED", event.reason);
  }
});

console.log("%c Streaker v3.4.12 ", "background: #0d9488; color: #ffffff; font-weight: bold; padding: 4px;");

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root not found");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);