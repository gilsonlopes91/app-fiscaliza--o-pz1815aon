import React, { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, ExternalLink, Navigation, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  parseCoordenadas,
  coordenadasDoRegistro,
  formatCoordenadas,
  googleMapsUrl,
  googleMapsRotaUrl,
  isLinkEncurtado,
} from '@/lib/geo'

interface CoordenadasFieldProps {
  latitude?: string
  longitude?: string
  onChange: (coords: { latitude: string; longitude: string }) => void
  /** Prefixo dos ids, para não colidir quando houver mais de um formulário na tela. */
  idPrefix?: string
  /** Versão reduzida (usada no modal de pré-vistoria). */
  compact?: boolean
}

/**
 * Campo único de coordenadas: aceita "-5.089123, -42.801456", graus/minutos/
 * segundos ou um link completo do Google Maps colado pelo fiscal. Assim que
 * reconhece o par, mostra o atalho para abrir o ponto no Google Maps.
 */
export function CoordenadasField({
  latitude,
  longitude,
  onChange,
  idPrefix = 'coord',
  compact = false,
}: CoordenadasFieldProps) {
  const [texto, setTexto] = useState('')

  // Sincroniza com o registro carregado (edição) sem atropelar o que o
  // usuário está digitando.
  useEffect(() => {
    const salvo = coordenadasDoRegistro(latitude, longitude)
    const atual = parseCoordenadas(texto)

    if (!salvo) {
      if (!texto) return
      if (!atual) return
      setTexto('')
      return
    }

    if (atual && atual.lat === salvo.lat && atual.lng === salvo.lng) return
    setTexto(formatCoordenadas(salvo.lat, salvo.lng))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude])

  const coords = parseCoordenadas(texto)
  const temTexto = texto.trim().length > 0
  const invalido = temTexto && !coords

  const handleChange = (valor: string) => {
    setTexto(valor)

    if (!valor.trim()) {
      onChange({ latitude: '', longitude: '' })
      return
    }

    const parsed = parseCoordenadas(valor)
    if (parsed) {
      onChange({ latitude: String(parsed.lat), longitude: String(parsed.lng) })
    } else {
      onChange({ latitude: '', longitude: '' })
    }
  }

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={`${idPrefix}-coordenadas`}
        className={`font-semibold text-[#102A43] flex items-center gap-1 ${
          compact ? 'text-xs font-bold' : 'text-sm'
        }`}
      >
        <MapPin className="w-3.5 h-3.5 text-[#004B8D]" />
        Coordenadas (latitude, longitude)
      </Label>

      <Input
        id={`${idPrefix}-coordenadas`}
        value={texto}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="-5.089123, -42.801456 ou cole o link do Google Maps"
        className={`bg-white border-[#D3DFE9] focus-visible:ring-[#004B8D] font-mono ${
          compact ? 'text-xs sm:text-sm' : ''
        } ${invalido ? 'border-amber-500 focus-visible:ring-amber-500' : ''}`}
      />

      {coords && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 font-mono">
            <CheckCircle2 className="w-3 h-3" />
            {formatCoordenadas(coords.lat, coords.lng)}
          </span>

          <a
            href={googleMapsUrl(coords.lat, coords.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#004B8D] hover:text-[#003666] hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Abrir no Google Maps
          </a>

          <a
            href={googleMapsRotaUrl(coords.lat, coords.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#486581] hover:text-[#102A43] hover:underline"
          >
            <Navigation className="w-3 h-3" />
            Traçar rota
          </a>
        </div>
      )}

      {invalido && (
        <p className="text-[11px] font-medium text-amber-700 flex items-start gap-1 pt-0.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
          {isLinkEncurtado(texto)
            ? 'Link encurtado não traz as coordenadas. Abra o link no Google Maps, toque no ponto e copie o link completo (ou as coordenadas).'
            : 'Não reconheci as coordenadas. Use o formato "-5.089123, -42.801456", graus (5°05\'21"S 42°48\'05"O) ou cole o link completo do Google Maps.'}
        </p>
      )}

      {!temTexto && !compact && (
        <p className="text-[11px] text-[#829AB1] leading-relaxed">
          Para empreendimentos rurais (fazendas, barragens, torres), informe as coordenadas no lugar
          do endereço. No Google Maps: toque e segure no ponto, depois copie as coordenadas ou o
          link.
        </p>
      )}
    </div>
  )
}

/** Exibição somente leitura das coordenadas, com atalho para o Google Maps. */
export function CoordenadasDisplay({
  latitude,
  longitude,
}: {
  latitude?: string
  longitude?: string
}) {
  const coords = coordenadasDoRegistro(latitude, longitude)

  if (!coords) {
    return <span className="text-[#829AB1] italic font-normal">Não informado</span>
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="font-mono font-semibold text-[#102A43]">
        {formatCoordenadas(coords.lat, coords.lng)}
      </span>
      <a
        href={googleMapsUrl(coords.lat, coords.lng)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#004B8D] hover:text-[#003666] hover:underline bg-[#E8F1F8] border border-[#004B8D]/20 rounded px-2 py-0.5"
      >
        <ExternalLink className="w-3 h-3" />
        Abrir no Google Maps
      </a>
      <a
        href={googleMapsRotaUrl(coords.lat, coords.lng)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#486581] hover:text-[#102A43] hover:underline"
      >
        <Navigation className="w-3 h-3" />
        Rota
      </a>
    </span>
  )
}
