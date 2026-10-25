const VERSION = 'v1';
const SHELL = `derevnya-shell-${VERSION}`;
const RUNTIME = `derevnya-runtime-${VERSION}`;
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'favicon.svg', 'favicon.ico', 'favicon-32.png',
  'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !fonts) return;

  if (req.mode === 'navigate') {
    // сеть первой — свежая версия игры, офлайн — из кэша
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone();
      caches.open(SHELL).then(c => c.put('index.html', copy));
      return r;
    }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r && (r.ok || r.type === 'opaque')) {
      const copy = r.clone();
      caches.open(fonts ? RUNTIME : SHELL).then(c => c.put(req, copy));
    }
    return r;
  })));
});
