/* عامل الخدمة: يفتح التطبيق فورًا من النسخة المحفوظة على الجهاز، ويجلب التحديثات في الخلفية.
 * Cache-first app shell. Every release MUST change CACHE (the tests check that all files are listed).
 * How updates work: the browser re-checks sw.js on each open (bypassing the HTTP cache). When sw.js
 * changed, the new worker downloads the whole new version in the background (install), then takes over;
 * the page shows "update ready" and the next open uses the new version. Pages never mix versions. */
var CACHE = 'babyplan-v9';
var FILES = [
  './', 'index.html', 'css/styles.css', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png',
  'fonts/plex-arabic-400.woff2', 'fonts/plex-arabic-600.woff2', 'fonts/plex-arabic-700.woff2',
  'fonts/plex-latin-400.woff2', 'fonts/plex-latin-600.woff2', 'fonts/plex-latin-700.woff2',
  'js/data/sources.js', 'js/data/growth.js', 'js/data/milestones.js', 'js/data/vaccines.js',
  'js/data/content.js', 'js/data/extra.js', 'js/data/topics.js',
  'js/engine.js', 'js/store.js', 'js/app.js'
];

self.addEventListener('install', function (e) {
  /* cache: 'reload' skips the HTTP cache so the new version is complete and fresh */
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  /* الصفحة نفسها (بما فيها ?do=breast من اختصارات الأيقونة) تُخدم من index.html المحفوظة */
  var key = req.mode === 'navigate' ? 'index.html' : req;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(key, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res.ok) c.put(req, res.clone());
        return res;
      });
    });
  }));
});
