/* Waterpolo Stats — guarda la app en el dispositivo para que abra sin internet.
   Estrategia: la app (index.html) se pide primero a internet, así cualquier cambio
   publicado se ve en el mismo momento en que se abre. Si no hay conexión, se abre
   la última versión guardada. Los íconos y el manifest salen de lo guardado. */
const CACHE = 'waterpolo-stats-v2';
const ARCHIVOS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function esLaApp(request) {
  if (request.mode === 'navigate') return true;
  const url = new URL(request.url);
  return url.origin === self.location.origin &&
    (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // La app: primero internet (siempre la última versión), y si falla, lo guardado.
  if (esLaApp(e.request)) {
    e.respondWith(
      fetch(e.request).then(r => {
        if (r && r.status === 200 && r.type === 'basic') {
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copia));
        }
        return r;
      }).catch(() =>
        caches.match(e.request, { ignoreSearch: true })
          .then(guardado => guardado || caches.match('./index.html'))
      )
    );
    return;
  }

  // El resto: primero lo guardado, y se actualiza en segundo plano.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(guardado => {
      const desdeLaRed = fetch(e.request).then(r => {
        if (r && r.status === 200 && r.type === 'basic') {
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return r;
      }).catch(() => guardado);
      return guardado || desdeLaRed;
    })
  );
});
