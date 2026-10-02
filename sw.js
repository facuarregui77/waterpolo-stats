/* Waterpolo Stats — guarda la app en el dispositivo para que abra sin internet.
   Estrategia: la app se abre con lo guardado, al instante, y mientras tanto se
   pide la versión nueva por atrás. Si hay una, queda lista para la próxima vez
   y la propia app avisa con el cartel verde. Así no hay que esperar a internet
   para empezar a cargar un partido al borde de la pileta.
   El manifest y los íconos van igual. Si no hay nada guardado todavía (primera
   vez), se espera a internet, que es la única forma de tenerlos. */
const CACHE = 'waterpolo-stats-v11';
const ARCHIVOS = ['./', './index.html', './manifest-v4.webmanifest', './icon-180-v4.png', './icon-512-v4.png'];

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

/* ¿Es la app en sí (la página) y no un archivo suelto? */
function esLaPagina(request) {
  if (request.mode === 'navigate') return true;
  const url = new URL(request.url);
  return url.origin === self.location.origin &&
    (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));
}

/* Guarda la respuesta. La página se guarda con sus dos nombres ('./' y
   './index.html') porque según cómo se abra se busca por uno o por el otro. */
function guardar(request, respuesta, esPagina) {
  if (!respuesta || respuesta.status !== 200 || respuesta.type !== 'basic') return;
  const copia = respuesta.clone();
  caches.open(CACHE).then(c => {
    if (esPagina) {
      c.put('./index.html', copia.clone());
      c.put('./', copia);
    } else {
      c.put(request, copia);
    }
  });
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  /* Cuando la app pregunta si hay version nueva lo hace con 'no-store': ese
     pedido tiene que ir al servidor si o si, nunca a lo guardado. */
  if (e.request.cache === 'no-store' || e.request.cache === 'reload') return;

  const esPagina = esLaPagina(e.request);

  e.respondWith(
    caches.open(CACHE).then(c =>
      c.match(e.request, { ignoreSearch: true }).then(guardado => {
        /* Pedido a internet: siempre saltea el guardado del navegador, así lo
           que se trae es de verdad lo último publicado. */
        const desdeLaRed = fetch(e.request.url, { cache: 'reload', credentials: 'same-origin' })
          .then(r => { guardar(e.request, r, esPagina); return r; })
          .catch(() => guardado || (esPagina ? c.match('./index.html') : undefined));

        if (guardado) {
          /* Hay copia: se abre al instante y la versión nueva queda para después */
          desdeLaRed.catch(() => {});
          return guardado;
        }
        /* Primera vez: no queda otra que esperar a internet */
        return desdeLaRed;
      })
    )
  );
});
