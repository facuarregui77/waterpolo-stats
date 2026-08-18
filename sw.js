/* Waterpolo Stats — guarda la app en el dispositivo para que abra sin internet.
   Estrategia: se responde primero desde lo guardado (rápido y sin conexión) y,
   si hay internet, se actualiza en segundo plano para la próxima vez. */
const CACHE = 'waterpolo-stats-v1';
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

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
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
