/* عامل الخدمة: يحفظ ملفات التطبيق ليعمل دون إنترنت. Offline cache for the app shell. */
var CACHE = 'babyplan-v5';
var FILES = [
  './', 'index.html', 'css/styles.css', 'manifest.webmanifest', 'icons/icon.svg', 'fonts/plex-arabic-400.woff2', 'fonts/plex-arabic-600.woff2', 'fonts/plex-arabic-700.woff2', 'fonts/plex-latin-400.woff2', 'fonts/plex-latin-600.woff2', 'fonts/plex-latin-700.woff2', 'icons/icon-192.png', 'icons/apple-touch-icon.png',
  'js/data/sources.js', 'js/data/growth.js', 'js/data/milestones.js', 'js/data/vaccines.js', 'js/data/content.js', 'js/data/extra.js', 'js/data/topics.js',
  'js/engine.js', 'js/store.js', 'js/app.js'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
/* Network first (so updates arrive), cache as fallback when offline. */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (res) {
    if (res.ok) {
      var copy = res.clone();
      e.waitUntil(caches.open(CACHE).then(function (c) { return c.put(e.request, copy); }));
    }
    return res;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
