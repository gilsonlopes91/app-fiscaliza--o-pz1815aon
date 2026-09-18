/* Service Worker - App Fiscalização CREA-PI */
const CACHE_NAME = 'fiscalizacao-creapi-v2'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/offline.html',
  '/icon.svg',
  '/icon-192.svg',
  '/icon-maskable.svg',
  '/apple-touch-icon.svg',
  '/og-image.png',
]

// Install: precache app shell and static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Cache addAll warning:', err)
        })
      })
      .then(() => self.skipWaiting()),
  )
})

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
        )
      })
      .then(() => self.clients.claim()),
  )
})

// Fetch strategy:
// 1. Navigation requests (HTML pages): Stale-While-Revalidate with fallback to /index.html/offline.html
//    Permite que o PWA abra instantaneamente do cache em frações de segundo mesmo com conexão lenta.
// 2. Static assets (scripts, styles, images, fonts): Cache-First / Stale-While-Revalidate
// 3. API/Pocketbase requests (/api/*): Network-only com bypass de cache para garantir dados frescos
self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // Don't intercept non-GET requests or backend real-time SSE
  if (req.method !== 'GET') return
  if (url.pathname.startsWith('/api/realtime')) return

  // Navigation (HTML Document) requests
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Tenta carregar do cache para renderização ultrarrápida do App Shell PWA
          const cachedResponse = await caches.match(req)
          const fetchPromise = fetch(req)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const resClone = networkResponse.clone()
                caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone))
              }
              return networkResponse
            })
            .catch(() => null)

          if (cachedResponse) {
            // Em background atualiza o cache para a próxima navegação
            fetchPromise
            return cachedResponse
          }

          // Se não está no cache, aguarda a rede
          const networkResponse = await fetchPromise
          if (networkResponse) return networkResponse

          // Fallbacks offline
          const cachedIndex = await caches.match('/index.html')
          if (cachedIndex) return cachedIndex

          const cachedOffline = await caches.match('/offline.html')
          if (cachedOffline) return cachedOffline

          return new Response('Sem conexão', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        } catch (_) {
          const fallback =
            (await caches.match('/index.html')) || (await caches.match('/offline.html'))
          return (
            fallback ||
            new Response('Sem conexão', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          )
        }
      })(),
    )
    return
  }

  // API calls: Network only (do not cache dynamic backend DB state by default in SW to avoid stale authorization)
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Static assets & Fonts: Stale-While-Revalidate com cache imediato
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.origin === self.location.origin ||
              url.origin.includes('fonts.googleapis.com') ||
              url.origin.includes('fonts.gstatic.com'))
          ) {
            const responseClone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, responseClone))
          }
          return networkResponse
        })
        .catch(() => {
          // Silent network failure when offline
          return null
        })

      return cachedResponse || fetchPromise
    }),
  )
})
