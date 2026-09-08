import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

// Armazena evento capturado globalmente para garantir disponibilidade entre renderizações/rotas
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    globalDeferredPrompt = e as BeforeInstallPromptEvent
  })
}

function detectIsStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  )
}

function detectIsIos(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIosDevice = /iPad|iPhone|iPod/.test(ua)
  // iPads mais recentes com iPadOS usam userAgent similar a Mac, mas com touch
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return isIosDevice || isIpadOs
}

export function usePwa() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt,
  )
  const [isInstalled, setIsInstalled] = useState<boolean>(() => detectIsStandalone())
  const [isInstallable, setIsInstallable] = useState<boolean>(
    () => !detectIsStandalone() && Boolean(globalDeferredPrompt),
  )
  const [isIos, setIsIos] = useState<boolean>(() => detectIsIos())
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const standalone = detectIsStandalone()
    setIsInstalled(standalone)
    setIsIos(detectIsIos())

    if (globalDeferredPrompt && !standalone) {
      setDeferredPrompt(globalDeferredPrompt)
      setIsInstallable(true)
    }

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      globalDeferredPrompt = e as BeforeInstallPromptEvent
      setDeferredPrompt(globalDeferredPrompt)
      if (!detectIsStandalone()) {
        setIsInstallable(true)
      }
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      globalDeferredPrompt = null
    }

    // Monitorar caso o display-mode mude (ex: app aberto após instalação)
    const mediaMatcher = window.matchMedia('(display-mode: standalone)')
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true)
        setIsInstallable(false)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    if (mediaMatcher?.addEventListener) {
      mediaMatcher.addEventListener('change', handleDisplayModeChange)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      if (mediaMatcher?.removeEventListener) {
        mediaMatcher.removeEventListener('change', handleDisplayModeChange)
      }
    }
  }, [])

  const installApp = async () => {
    if (!deferredPrompt) {
      return false
    }

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true)
        setIsInstallable(false)
        setDeferredPrompt(null)
        globalDeferredPrompt = null
        return true
      }
      return false
    } catch (err) {
      console.error('[PWA] Prompt error:', err)
      return false
    }
  }

  return {
    isInstallable,
    isInstalled,
    isIos,
    isOnline,
    installApp,
  }
}
