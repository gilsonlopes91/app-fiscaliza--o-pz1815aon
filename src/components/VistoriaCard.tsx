import React, { useState } from 'react'
import {
  Building2,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  MapPin,
  ClipboardList,
  FileText,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Vistoria } from '@/services/vistorias'

interface VistoriaCardProps {
  vistoria: Vistoria
  pendentesCount: number
  vencidosCount: number
  conformesCount: number
  totalItensCount: number
  onClick: () => void
  onGenerateReport?: (e: React.MouseEvent) => void
  isGeneratingReport?: boolean
}

export function VistoriaCard({
  vistoria,
  pendentesCount,
  vencidosCount,
  conformesCount,
  totalItensCount,
  onClick,
  onGenerateReport,
  isGeneratingReport = false,
}: VistoriaCardProps) {
  const hospital = vistoria.expand?.hospital
  const createdDate = new Date(vistoria.created).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const totalAtencao = pendentesCount + vencidosCount

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="group bg-white border border-[#D3DFE9] hover:border-[#004B8D] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,75,141,0.1)] transition-all duration-200 cursor-pointer flex flex-col justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004B8D] focus-visible:ring-offset-2"
    >
      <div>
        {/* Top Header inside Card */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#E8F1F8] group-hover:bg-[#004B8D] flex items-center justify-center text-[#004B8D] group-hover:text-white transition-colors duration-200 shrink-0 shadow-xs">
              <ClipboardList className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#004B8D] bg-[#E8F1F8] px-2 py-0.5 rounded">
                Vistoria Aberta
              </span>
              <div className="text-xs text-[#486581] flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3 text-[#004B8D]" />
                <span>Iniciada em {createdDate}</span>
              </div>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-[#F4F6F9] group-hover:bg-[#E8F1F8] text-[#627D98] group-hover:text-[#004B8D] flex items-center justify-center transition-all group-hover:translate-x-0.5">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Hospital Title */}
        <h3 className="text-base sm:text-lg font-bold text-[#102A43] group-hover:text-[#004B8D] transition-colors leading-snug line-clamp-2 mb-2">
          {hospital?.nome || 'Hospital não identificado'}
        </h3>

        {/* Hospital Location & CNES */}
        {hospital && (
          <div className="text-xs text-[#486581] flex flex-wrap items-center gap-2 mb-4">
            <span className="flex items-center gap-1 font-medium text-[#102A43]">
              <MapPin className="w-3 h-3 text-[#004B8D]" />
              {hospital.municipio}
            </span>
            <span>•</span>
            <span className="font-mono text-[#486581]">CNES: {hospital.cnes}</span>
            {hospital.tipo && (
              <>
                <span>•</span>
                <span className="text-[#627D98]">{hospital.tipo}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="pt-4 border-t border-[#D3DFE9]/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {totalAtencao > 0 ? (
              <Badge className="bg-rose-50 text-rose-800 border-rose-300 font-bold text-[11px] px-2 py-0.5 gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                {totalAtencao} {totalAtencao === 1 ? 'pendência/vencido' : 'pendências/vencidos'}
              </Badge>
            ) : (
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[11px] px-2 py-0.5 gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Em conformidade
              </Badge>
            )}

            {conformesCount > 0 && (
              <span className="text-[11px] text-[#486581] bg-[#F4F6F9] px-2 py-0.5 rounded font-medium">
                {conformesCount} {conformesCount === 1 ? 'conforme' : 'conformes'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onGenerateReport && (
              <Button
                size="sm"
                variant="outline"
                type="button"
                disabled={isGeneratingReport}
                onClick={(e) => {
                  e.stopPropagation()
                  onGenerateReport(e)
                }}
                className="h-8 px-2.5 text-[11px] font-bold border-[#004B8D]/30 text-[#004B8D] hover:bg-[#E8F1F8] hover:text-[#003666] gap-1 cursor-pointer transition-colors"
                title="Gerar Relatório em PDF"
              >
                {isGeneratingReport ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
                <span>Relatório PDF</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              className="text-xs font-bold text-[#004B8D] p-0 h-auto hover:bg-transparent group-hover:underline flex items-center gap-1"
            >
              Continuar
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
