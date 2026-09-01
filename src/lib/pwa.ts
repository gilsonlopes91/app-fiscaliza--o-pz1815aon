// Service Worker registration helper

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA] Service Worker registrado com sucesso no escopo:', registration.scope)

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] Nova versão do app disponível.')
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('[PWA] Falha ao registrar Service Worker:', error)
        })
    })
  }
}
