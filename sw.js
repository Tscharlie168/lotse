/* Lotse – Service Worker (v15) – Stand: 3. Juli 2026
   Neu gegenüber v14:
   - Kopfrechnen: Aufgaben mit 3-4 Zahlen und allen vier Grundrechenarten
     (Punkt vor Strich) statt nur kleinem Einmaleins.
   Neu gegenüber v13:
   - Unterhaltung: drei neue Spiele (Paare finden, Kopfrechnen, Wort-Raten).
   - Witz des Tages merkt sich die Position, damit nach einem Neustart
     nicht wieder derselbe Witz erscheint.
   Neu gegenüber v12:
   - Weitergeben: iPhone-Anleitung weist jetzt darauf hin, dass die
     Installation in Safari erfolgen muss.
   Neu gegenüber v11:
   - Mein Tag: Gedicht des Tages (nur gemeinfreie Dichter, jahreszeitlich).
   Neu gegenüber v10:
   - Notfallzettel: Organspender (Ja/Nein) und 2. Notfallkontakt.
   Neu gegenüber v9:
   - Ortswahl: Standort-Kasten oben ist antippbar, Ort von Hand wählbar
     (für Geräte, deren Ortung nicht funktioniert, z. B. iPhone-Web-Apps).
   - Der "Land"-Knopf entfällt: Das Land ergibt sich automatisch aus dem
     georteten oder gewählten Ort (auch für Notrufnummern und Portale).
   Neu gegenüber v8:
   - Hinweis bei Knöpfen, die fremde Seiten öffnen (Cookies/Datenschutz).
   - Namenstage: an Festtagen steht jetzt ein Name voran.
   Neu gegenüber v7:
   - Notruf: "Wo bin ich?" (Adresse groß anzeigen) und Notfallzettel.
   - In der Nähe: Verweis auf den Apotheken-Notdienst (aponet.de).
   Neu gegenüber v6:
   - Foto des Tages lädt die Bilderliste jetzt auch auf 1a-lotse.de.
   - Zurück-Taste des Handys führt eine Ansicht zurück statt die App zu
     schließen; Textgröße-Schalter und Merkzettel-Teilen sind neu.
   Grundprinzip (unverändert seit v2):
   - Jede Seite wird unter ihrem EIGENEN Schlüssel gespeichert.
   - Die Seite kommt zuerst frisch aus dem Netz (Updates erscheinen
     automatisch), nur ohne Internet greift die gespeicherte Kopie. Symbole &
     Manifest kommen zuerst aus dem Speicher. Fremde Dienste (Karten,
     OpenStreetMap, Wetter) immer aus dem Netz.
   Wichtig: Die Zahl in CACHE bei jeder Änderung an den SHELL-Dateien um eins
   erhöhen, damit alte gespeicherte Kopien sauber ersetzt werden. */

const CACHE = 'lotse-v18';
const SHELL = [
  './',
  './index.html',
  './bsb-fahrplan.html',
  './autofaehre.html',
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
    const pageKey =
      url.pathname.endsWith('/bsb-fahrplan.html') ? './bsb-fahrplan.html' :
      url.pathname.endsWith('/autofaehre.html')   ? './autofaehre.html'   : './index.html';
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
