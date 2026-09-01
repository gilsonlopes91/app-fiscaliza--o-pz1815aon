/* Service Worker - App Fiscalização CREA-PI */
const CACHE_NAME = 'fiscalizacao-creapi-v1'
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
// 1. Navigation requests (HTML pages): Network-first with cache fallback, then offline.html
// 2. Static assets (scripts, styles, images, fonts): Stale-While-Revalidate
// 3. API/Pocketbase requests (/api/*): Network-only with grace on failure
self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // Don't intercept non-GET requests or backend real-time SSE
  if (req.method !== 'GET') return
  if (url.pathname.startsWith('/api/realtime')) return

  // Navigation (HTML Document) requests
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          // If valid response, clone and cache for offline reload
          if (response && response.status === 200) {
            const resClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone))
          }
          return response
        })
        .catch(async () => {
          const cachedResponse = await caches.match(req)
          if (cachedResponse) return cachedResponse

          const cachedIndex = await caches.match('/index.html')
          if (cachedIndex) return cachedIndex

          const cachedOffline = await caches.match('/offline.html')
          if (cachedOffline) return cachedOffline

          return new Response('Sem conexão', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        }),
    )
    return
  }

  // API calls: Network only (do not cache dynamic backend DB state by default in SW to avoid stale authorization)
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Static assets & Fonts: Stale-While-Revalidate
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
