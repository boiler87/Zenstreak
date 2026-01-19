// This is a "Killer" Service Worker.
// It replaces any existing Service Worker, forces itself to activate immediately,
// unregisters itself, and then reloads the page to ensure the latest content is fetched.

self.addEventListener('install', (event) => {
  // force this sw to become the active one immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister()
      .then(() => self.clients.matchAll())
      .then((clients) => {
        // force all open tabs to reload to get the fresh network content
        clients.forEach(client => client.navigate(client.url));
      })
  );
});