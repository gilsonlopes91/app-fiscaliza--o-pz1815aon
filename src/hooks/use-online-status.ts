import { useEffect, useState } from 'react'
import { estaOnline } from '@/services/offlineSync'

/** Acompanha se o aparelho está com rede, para a tela avisar o fiscal. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() => estaOnline())

  useEffect(() => {
    const aoConectar = () => setOnline(true)
    const aoDesconectar = () => setOnline(false)

    window.addEventListener('online', aoConectar)
    window.addEventListener('offline', aoDesconectar)

    return () => {
      window.removeEventListener('online', aoConectar)
      window.removeEventListener('offline', aoDesconectar)
    }
  }, [])

  return online
}
