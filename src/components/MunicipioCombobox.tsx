import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Check, AlertCircle, Search } from 'lucide-react'
import { buscarMunicipios, resolverMunicipio, MUNICIPIOS_PIAUI } from '@/lib/municipiosPiaui'

interface MunicipioComboboxProps {
  value: string
  onChange: (municipio: string) => void
  id?: string
  /** Mensagem de erro vinda da validação do formulário. */
  error?: string
  /** Versão reduzida (usada no modal de pré-vistoria). */
  compact?: boolean
  label?: string
}

/**
 * Campo de município digitável com autocomplete restrito aos 224 municípios
 * do Piauí. Digitar "cor" sugere Corrente e Coronel José Dias; só é aceito o
 * nome oficial, para que o relatório não tenha duas grafias da mesma cidade.
 */
export function MunicipioCombobox({
  value,
  onChange,
  id = 'municipio',
  error,
  compact = false,
  label = 'Município',
}: MunicipioComboboxProps) {
  const [texto, setTexto] = useState(value || '')
  const [aberto, setAberto] = useState(false)
  const [destaque, setDestaque] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const listaRef = useRef<HTMLUListElement>(null)

  // Sincroniza quando o formulário carrega outro registro
  useEffect(() => {
    setTexto(value || '')
  }, [value])

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  const sugestoes = useMemo(() => buscarMunicipios(texto), [texto])
  const oficial = resolverMunicipio(texto)
  const invalido = texto.trim().length > 0 && !oficial

  const selecionar = (municipio: string) => {
    setTexto(municipio)
    onChange(municipio)
    setAberto(false)
  }

  const handleChange = (valor: string) => {
    setTexto(valor)
    setAberto(true)
    setDestaque(0)
    // Grava o nome oficial quando o texto já corresponde a um município
    onChange(resolverMunicipio(valor) || valor)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!aberto) {
        setAberto(true)
        return
      }
      setDestaque((atual) => {
        const proximo = e.key === 'ArrowDown' ? atual + 1 : atual - 1
        if (proximo < 0) return sugestoes.length - 1
        if (proximo >= sugestoes.length) return 0
        return proximo
      })
      return
    }

    if (e.key === 'Enter' && aberto && sugestoes.length > 0) {
      // Impede que o Enter envie o formulário enquanto a lista está aberta
      e.preventDefault()
      selecionar(sugestoes[destaque] || sugestoes[0])
      return
    }

    if (e.key === 'Escape' && aberto) {
      e.preventDefault()
      setAberto(false)
    }
  }

  // Mantém o item destacado visível na rolagem
  useEffect(() => {
    if (!aberto || !listaRef.current) return
    const item = listaRef.current.children[destaque] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [destaque, aberto])

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <Label
        htmlFor={id}
        className={`font-semibold text-[#102A43] flex items-center gap-1 ${
          compact ? 'text-xs font-bold' : 'text-sm'
        }`}
      >
        <MapPin className="w-3.5 h-3.5 text-[#004B8D]" />
        {label} <span className="text-red-500">*</span>
      </Label>

      <div className="relative">
        <Input
          id={id}
          value={texto}
          autoComplete="off"
          role="combobox"
          aria-expanded={aberto}
          aria-autocomplete="list"
          placeholder="Digite e escolha (ex.: Cor... → Corrente)"
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setAberto(true)}
          onKeyDown={handleKeyDown}
          className={`bg-white border-[#D3DFE9] focus-visible:ring-[#004B8D] pr-8 ${
            compact ? 'text-xs sm:text-sm' : ''
          } ${
            error || invalido
              ? 'border-red-500 focus-visible:ring-red-500'
              : oficial
                ? 'border-emerald-400'
                : ''
          }`}
        />

        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {oficial ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Search className="w-3.5 h-3.5 text-[#829AB1]" />
          )}
        </span>

        {aberto && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#D3DFE9] rounded-lg shadow-lg overflow-hidden">
            {sugestoes.length > 0 ? (
              <>
                <ul ref={listaRef} className="max-h-56 overflow-y-auto py-1">
                  {sugestoes.map((municipio, idx) => (
                    <li key={municipio}>
                      <button
                        type="button"
                        onMouseEnter={() => setDestaque(idx)}
                        onClick={() => selecionar(municipio)}
                        className={`w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors ${
                          idx === destaque
                            ? 'bg-[#E8F1F8] text-[#004B8D] font-semibold'
                            : 'text-[#102A43] hover:bg-[#F4F6F9]'
                        }`}
                      >
                        {municipio}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-[#D3DFE9] px-3 py-1.5 text-[10px] text-[#829AB1] bg-[#F4F6F9]">
                  {sugestoes.length} de {MUNICIPIOS_PIAUI.length} municípios do Piauí
                </div>
              </>
            ) : (
              <div className="px-3 py-3 text-xs text-[#486581]">
                Nenhum município do Piauí corresponde a &ldquo;{texto}&rdquo;.
              </div>
            )}
          </div>
        )}
      </div>

      {(error || invalido) && (
        <p className="text-xs font-medium text-red-500 flex items-start gap-1 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
          {error || 'Selecione um dos 224 municípios do Piauí na lista.'}
        </p>
      )}
    </div>
  )
}
