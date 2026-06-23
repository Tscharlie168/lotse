/* Lotse – Service Worker
   Speichert die eigene App-Hülle, damit Notruf & Erste Hilfe auch ohne
   Internet öffnen. Fremde Dienste (Karten, OpenStreetMap) gehen weiter
   immer übers Netz – die brauchen es ohnehin. */

const CACHE = 'lotse-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Nur eigene Dateien aus dem Speicher bedienen; alles Fremde aus dem Netz.
  if (e.request.method === 'GET' && url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match('./index.html')))
    );
  }
});
