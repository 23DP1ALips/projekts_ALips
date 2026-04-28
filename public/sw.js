const VERSIJA = 'forum-cache-v5';
const STATISKAS_VIETAS = [
    '/',
    '/css/style.css',
    '/js/app.js',
    '/manifest.json',
    '/icons/icon.svg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(VERSIJA).then((kese) => kese.addAll(STATISKAS_VIETAS)).catch(() => {})
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((atslegas) =>
            Promise.all(atslegas.filter((a) => a !== VERSIJA).map((a) => caches.delete(a)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(req).then((atb) => {
                const kopija = atb.clone();
                caches.open(VERSIJA).then((kese) => kese.put(req, kopija)).catch(() => {});
                return atb;
            }).catch(() => caches.match(req).then((kesetais) => kesetais || caches.match('/')))
        );
        return;
    }

    event.respondWith(
        caches.match(req).then((kesetais) => {
            if (kesetais) return kesetais;
            return fetch(req).then((atb) => {
                if (atb && atb.status === 200) {
                    const kopija = atb.clone();
                    caches.open(VERSIJA).then((kese) => kese.put(req, kopija)).catch(() => {});
                }
                return atb;
            });
        })
    );
});
