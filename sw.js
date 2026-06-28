/* Lotse – Service Worker (v3)
   Neu gegenüber v2:
   - Die BSB-Schiffsfahrplan-Seite (bsb-fahrplan.html) ist jetzt mit im
     Offline-Speicher.
   - Jede Seite wird unter ihrem EIGENEN Schlüssel gespeichert. Vorher landete
     jede Seite unter './index.html' – das hätte mit einer zweiten Seite den
     Offline-Speicher durcheinandergebracht.
   Wie v2: Die Seite kommt zuerst frisch aus dem Netz (Updates erscheinen
   automatisch), nur ohne Internet greift die gespeicherte Kopie. Symbole &
   Manifest kommen zuerst aus dem Speicher. Fremde Dienste (Karten,
   OpenStreetMap, Wetter) immer aus dem Netz. */

const CACHE = 'lotse-v3';
const SHELL = [
  './',
  './index.html',
  './bsb-fahrplan.html',
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
  if (url.origin !== location.origin) return; // Karten/OSM/Wetter o. Ä. nie abfangen

  const istSeite = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (istSeite) {
    // Seite unter ihrem eigenen, sauberen Schlüssel ablegen (ohne ?lat=..&lng=..)
    const pageKey = url.pathname.endsWith('/bsb-fahrplan.html') ? './bsb-fahrplan.html' : './index.html';
    // zuerst Netz (frischer Stand), bei Offline die passende Kopie
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(pageKey, copy)).catch(() => {});
        return resp;
      }).catch(() =>
        caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'))
      )
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
