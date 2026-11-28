/* Service worker: la app siempre trae lo último de la red; el caché es solo para
   abrir sin conexión (muestra tus últimos datos locales). */
const CACHE = 'mis-finanzas-v17';
const PREF = 'misoles-pref';
const SHARE = 'misoles-share';
/* Librerías pesadas de reportes: no se precargan; se guardan la primera vez que se usan. */
const RUNTIME = [
  'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'
];
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
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== PREF && k !== SHARE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function recibirCompartido(req) {
  try {
    const f = await req.formData();
    const x = [...new Set(['title', 'text'].map(k => f.get(k)).filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()))].join('\n').slice(0, 600);
    if (x) { const c = await caches.open(SHARE); await c.put('./__compartido', new Response(JSON.stringify({ x, t: Date.now() }), { headers: { 'Content-Type': 'application/json' } })); }
  } catch (_) {}
  return Response.redirect(new URL('./#compartido', self.location).href, 303);
}
self.addEventListener('fetch', e => {
  const req = e.request;
  let url; try { url = new URL(req.url); } catch (_) { return; }
  // Compartir a MiS²oles: el texto se queda en este dispositivo y nunca llega al servidor de la página.
  if (req.method === 'POST' && url.origin === location.origin && url.pathname.endsWith('/compartir')) { e.respondWith(recibirCompartido(req)); return; }
  if (req.method !== 'GET') return;
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
      try { if (resp && resp.ok && (url.origin === location.origin || ASSETS.indexOf(req.url) >= 0 || RUNTIME.indexOf(req.url) >= 0)) { const cp = resp.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } } catch (_) {}
      return resp;
    }).catch(() => undefined))
  );
});
/* Recordatorios: el aviso llega sin contenido; el texto se elige aquí, con el idioma y la frecuencia guardados en este dispositivo. */
const AVISOS = {
  es: { diario: '¿Ya anotaste tus gastos de hoy? Te toma menos de un minuto.', semanal: 'Revisa cómo te fue esta semana y anota lo que falte.' },
  en: { diario: 'Have you logged today’s spending? It takes less than a minute.', semanal: 'Check how your week went and log anything missing.' }
};
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let p = {};
    try { const c = await caches.open(PREF); const r = await c.match('./__pref'); if (r) p = await r.json(); } catch (_) {}
    const t = AVISOS[p.l === 'en' ? 'en' : 'es'];
    await self.registration.showNotification('MiS²oles', { body: t[p.f === 'semanal' ? 'semanal' : 'diario'], icon: 'icon-192.png', badge: 'icon-192.png', tag: 'recordatorio' });
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL('./', self.location).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    const w = l.find(c => c.url.startsWith(url));
    return w ? w.focus() : self.clients.openWindow(url);
  }));
});
