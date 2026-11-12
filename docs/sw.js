// Service worker de Medidas: deja instalar la app y abrirla sin cobertura.
// Sus archivos: primero la red y, sin conexión, la copia guardada. Supabase no se toca.
// Al actualizarse solo borra sus cachés (medidas-*): en la misma web hay otras apps con las suyas.
const CACHE = 'medidas-v32';
const APP = ['./', './index.html', './styles.css', './manifest.webmanifest', './icons/icon-192-v2.png', './icons/icon-512-v2.png', './js/app.js', './js/almacen.js', './js/alzado.js', './js/boceto.js', './js/calculadora.js', './js/campos.js', './js/config.js', './js/imagen.js', './js/modelo.js', './js/modulos.js', './js/nube.js', './js/pdf.js', './js/perspectiva.js', './js/resumen.js', './js/plano-editor.js', './js/plano-geo.js', './js/plano-vista.js', './js/sincro.js', './js/trabajos.js', './js/version.js', './js/unidades.js', './js/util.js', './js/pantallas/adjuntos.js', './js/pantallas/ajustes.js', './js/pantallas/ficha.js', './js/pantallas/inicio.js', './js/pantallas/papelera.js', './js/pantallas/pendientes.js', './js/pantallas/perspectiva-ui.js', './js/pantallas/resumen.js', './js/pantallas/trabajo.js'];
const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/dist/umd/supabase.js';
const LIBS = /^https:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)\//;
const PDF = ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'];

self.addEventListener('install', e => {
  // La librería se guarda ya en la instalación: sin ella no hay sincronización al abrir sin cobertura.
  e.waitUntil(caches.open(CACHE).then(c => Promise.all([c.addAll(APP.map(u => new Request(u, { cache: 'reload' }))), c.add(new Request(LIB, { mode: 'cors' })).catch(() => null), ...PDF.map(u => c.add(new Request(u, { mode: 'cors' })).catch(() => null))])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('medidas-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // Siempre se pregunta al servidor (GitHub Pages deja los archivos 10 minutos en la caché del navegador
    // y la versión nueva tardaba en llegar). Si no ha cambiado, contesta «sin cambios» y apenas gasta datos.
    const red = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req, { cache: 'no-cache' });
    e.respondWith(red.then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); } return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  if (LIBS.test(req.url)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const guardada = await c.match(req);
      if (guardada) return guardada;
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    }));
  }
});
