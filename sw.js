/* Service worker: cachea la app para abrir sin conexión (muestra tus últimos datos locales). */
const CACHE = 'mis-finanzas-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(()=>{}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url; try { url = new URL(req.url); } catch (_) { return; }
  // No cachear llamadas a la API de Supabase (auth y datos deben ir a la red).
  if (url.hostname.endsWith('supabase.co') && url.pathname !== '/') return;
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(resp => {
      try {
        if (resp && resp.ok && (url.origin === location.origin || SHELL.indexOf(req.url) >= 0)) {
          const copy = resp.clone(); caches.open(CACHE).then(c => c.put(req, copy));
        }
      } catch (_) {}
      return resp;
    }).catch(() => req.mode === 'navigate' ? caches.match('./index.html') : undefined))
  );
});
