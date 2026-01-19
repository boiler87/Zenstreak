import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- AGGRESSIVE CLEANUP ROUTINE ---
// This runs on every load to ensure no stale Service Workers or Caches persist.
const cleanUp = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for(let registration of registrations) {
        console.log('Unregistering found SW:', registration);
        await registration.unregister();
      }
    } catch (e) {
      console.warn('SW Cleanup failed:', e);
    }
  }
  
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      for(const key of keys) {
        console.log('Deleting cache storage:', key);
        await caches.delete(key);
      }
    } catch (e) {
      console.warn('Cache Storage cleanup failed:', e);
    }
  }
};

// Execute cleanup immediately
cleanUp();

// Global Error Handler for API keys
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes("API key")) {
    console.error("CRITICAL: API KEY ERROR DETECTED", event.reason);
  }
});

console.log("%c Streaker v1.7.0 ", "background: #0d9488; color: #ffffff; font-weight: bold; padding: 4px;");

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root not found");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);