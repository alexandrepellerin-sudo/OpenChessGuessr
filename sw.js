// Hors ligne : on sert le cache tout de suite et on le rafraîchit en arrière-plan.
const CACHE = 'ocg-v1';
const PIECES = ['w', 'b'].flatMap((c) => 'KQRBNP'.split('').map((p) => `assets/pieces/${c}${p}.svg`));
const SHELL = ['./', 'index.html', 'css/style.css', 'js/main.js', 'js/board.js', 'js/game.js', 'js/store.js',
  'data/openings.json', 'manifest.webmanifest', 'assets/icons/icon.svg', ...PIECES];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const network = fetch(e.request)
        .then((res) => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
