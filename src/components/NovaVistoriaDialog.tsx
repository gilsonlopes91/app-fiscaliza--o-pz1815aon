import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Building2, Plus, Sparkles, Loader2, MapPin, Layers } from 'lucide-react'
import { Hospital } from '@/services/hospitais'
import { TipoEmpreendimento } from '@/services/tiposEmpreendimento'
import { IniciarVistoriaModal } from '@/components/IniciarVistoriaModal'

interface NovaVistoriaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hospitais: Hospital[]
  tipos?: TipoEmpreendimento[]
  selectedTipoFiltro?: string
  onSelectHospital: (hospitalId: string) => Promise<void>
}

export function NovaVistoriaDialog({
  open,
  onOpenChange,
  hospitais,
  tipos = [],
  selectedTipoFiltro,
  onSelectHospital,
}: NovaVistoriaDialogProps) {
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('')
  const [tipoModalFiltro, setTipoModalFiltro] = useState<string>(selectedTipoFiltro || 'todos')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPreVistoriaOpen, setIsPreVistoriaOpen] = useState(false)

  // Keep modal filter synced if prop changes
  React.useEffect(() => {
    if (selectedTipoFiltro) {
      setTipoModalFiltro(selectedTipoFiltro)
    }
  }, [selectedTipoFiltro, open])

  const filteredHospitais = hospitais.filter((h) => {
    if (tipoModalFiltro === 'todos') return true
    const t = (h.tipo || 'Hospital').trim().toLowerCase()
    return t === tipoModalFiltro.trim().toLowerCase()
  })

  const handleConfirm = () => {
    if (!selectedHospitalId) return
    // Interpõe a conferência pré-vistoria
    setIsPreVistoriaOpen(true)
  }

  const handlePreVistoriaConfirm = async (updatedHospital: Hospital) => {
    try {
      setIsSubmitting(true)
      await onSelectHospital(updatedHospital.id)
      setIsPreVistoriaOpen(false)
      onOpenChange(false)
      setSelectedHospitalId('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedHospital = hospitais.find((h) => h.id === selectedHospitalId)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg bg-white border-[#D3DFE9] p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-4 sm:p-6 pb-4 bg-[#F4F6F9] border-b border-[#D3DFE9]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#004B8D] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#102A43]">
                  Nova Vistoria Técnica CREA-PI
                </DialogTitle>
                <DialogDescription className="text-xs text-[#486581]">
                  Selecione o tipo de empreendimento e a unidade para preencher o checklist.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            {/* Filter by Tipo if tipos list is provided */}
            {tipos.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#102A43] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#004B8D]" />
                  Filtrar por Tipo de Empreendimento
                </Label>
                <Select
                  value={tipoModalFiltro}
                  onValueChange={(val) => {
                    setTipoModalFiltro(val)
                    setSelectedHospitalId('')
                  }}
                >
                  <SelectTrigger className="w-full h-10 border-[#D3DFE9] text-xs font-medium focus:ring-[#004B8D] bg-white">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos ({hospitais.length})</SelectItem>
                    {tipos.map((t) => (
                      <SelectItem key={t.id} value={t.nome}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="hospital-select" className="text-xs font-bold text-[#102A43]">
                  Selecione a Unidade / Estabelecimento <span className="text-rose-600">*</span>
                </Label>
                <span className="text-[11px] text-[#627D98]">
                  {filteredHospitais.length} disponíveis
                </span>
              </div>
              <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
                <SelectTrigger
                  id="hospital-select"
                  className="w-full h-11 border-[#D3DFE9] text-sm font-medium focus:ring-[#004B8D] bg-white"
                >
                  <SelectValue placeholder="Escolha um estabelecimento da lista..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {filteredHospitais.length === 0 ? (
                    <div className="p-3 text-xs text-center text-[#627D98]">
                      Nenhuma unidade cadastrada neste tipo.
                    </div>
                  ) : (
                    filteredHospitais.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        <div className="flex flex-col text-left py-0.5">
                          <span className="font-semibold text-[#102A43] text-sm truncate max-w-sm">
                            {h.nome}
                          </span>
                          <span className="text-[11px] text-[#486581] flex items-center gap-1.5">
                            <span>{h.municipio}</span>
                            <span>•</span>
                            <span className="font-mono">CNES: {h.cnes}</span>
                            {h.tipo && (
                              <>
                                <span>•</span>
                                <span className="text-[#004B8D] font-medium">{h.tipo}</span>
                              </>
                            )}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedHospital && (
              <div className="p-3.5 rounded-xl bg-[#E8F1F8] border border-[#004B8D]/20 text-xs text-[#102A43] space-y-1 animate-page-enter">
                <div className="font-bold text-[#004B8D] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {selectedHospital.nome}
                </div>
                <div className="text-[#486581] flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#004B8D]" />
                    {selectedHospital.municipio}
                  </span>
                  <span>•</span>
                  <span className="font-mono font-semibold">CNES: {selectedHospital.cnes}</span>
                  <span>•</span>
                  <span className="font-medium text-[#004B8D]">
                    Tipo: {selectedHospital.tipo || 'Hospital'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 sm:px-6 bg-[#F4F6F9] border-t border-[#D3DFE9] flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-[#D3DFE9] text-[#486581] hover:text-[#102A43]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedHospitalId || isSubmitting}
              className="bg-[#004B8D] hover:bg-[#003666] text-white shadow-sm font-semibold cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Iniciar Fiscalização
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de conferência dos dados do estabelecimento antes de abrir o checklist */}
      {selectedHospital && (
        <IniciarVistoriaModal
          open={isPreVistoriaOpen}
          onOpenChange={setIsPreVistoriaOpen}
          hospital={selectedHospital}
          onConfirmAndContinue={handlePreVistoriaConfirm}
        />
      )}
    </>
  )
}
