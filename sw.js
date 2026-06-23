/* Lotse – Service Worker (v2)
   Neu gegenüber v1: Die Seite selbst wird zuerst frisch aus dem Netz geholt,
   damit Updates automatisch erscheinen. Nur ohne Internet greift die
   gespeicherte Kopie. Symbole & Manifest kommen weiter zuerst aus dem
   Speicher (schnell). Fremde Dienste (Karten, OpenStreetMap) immer aus dem Netz. */

const CACHE = 'lotse-v2';
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
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Karten/OSM o. Ä. nie abfangen

  const istSeite = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (istSeite) {
    // Seite: zuerst Netz (frischer Stand), bei Offline die Kopie
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Übrige eigene Dateien (Symbole, Manifest): zuerst Kopie, sonst Netz
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return resp;
    }))
  );
});
