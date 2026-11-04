/* Service worker: la app siempre trae lo último de la red; el caché es solo para
   abrir sin conexión (muestra tus últimos datos locales). */
const CACHE = 'mis-finanzas-v2';
const ASSETS = [
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url; try { url = new URL(req.url); } catch (_) { return; }
  // La API de Supabase (auth y datos) siempre a la red, nunca cacheada.
  if (url.hostname.endsWith('supabase.co') && url.pathname !== '/') return;

  const isPage = req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('/'))
    || url.pathname.endsWith('index.html');

  if (isPage) {
    // Red primero: siempre lo último; si no hay internet, lo último cacheado.
    e.respondWith(
      fetch(req).then(resp => {
        try { const cp = resp.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); } catch (_) {}
        return resp;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match(req)))
    );
    return;
  }
  // Recursos estáticos (scripts, íconos): caché primero, rápido.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(resp => {
      try { if (resp && resp.ok && (url.origin === location.origin || ASSETS.indexOf(req.url) >= 0)) { const cp = resp.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } } catch (_) {}
      return resp;
    }).catch(() => undefined))
  );
});
