// Nome della cache — cambia questo numero quando aggiorni l'app
const CACHE_NAME = 'budget-app-v1';

// File da salvare offline
const FILE_DA_SALVARE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Installazione: salva tutti i file nella cache
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(FILE_DA_SALVARE);
        })
    );
});

// Attivazione: elimina le cache vecchie
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(nomi) {
            return Promise.all(
                nomi.filter(function(nome) {
                    return nome !== CACHE_NAME;
                }).map(function(nome) {
                    return caches.delete(nome);
                })
            );
        })
    );
});

// Intercetta le richieste di rete
// Se il file è in cache lo serve da lì, altrimenti va in rete
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(risposta) {
            return risposta || fetch(event.request);
        })
    );
});
