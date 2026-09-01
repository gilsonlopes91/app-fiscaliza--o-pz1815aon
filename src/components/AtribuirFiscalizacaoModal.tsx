import React, { useState, useMemo } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  UserPlus,
  Building2,
  Users,
  Calendar,
  Layers,
  Search,
  Check,
  X,
  Loader2,
  CheckSquare,
  Square,
} from 'lucide-react'
import { Hospital } from '@/services/hospitais'
import { UserProfile } from '@/services/auth'
import { TipoEmpreendimento } from '@/services/tiposEmpreendimento'
import { atribuicoesService } from '@/services/atribuicoes'
import { useToast } from '@/hooks/use-toast'

interface AtribuirFiscalizacaoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fiscais: UserProfile[]
  hospitais: Hospital[]
  tipos: TipoEmpreendimento[]
  preSelectedFiscalId?: string
  preSelectedHospitalId?: string
  onSuccess: () => Promise<void>
}

export function AtribuirFiscalizacaoModal({
  open,
  onOpenChange,
  fiscais,
  hospitais,
  tipos,
  preSelectedFiscalId,
  preSelectedHospitalId,
  onSuccess,
}: AtribuirFiscalizacaoModalProps) {
  const { toast } = useToast()

  const [selectedFiscalId, setSelectedFiscalId] = useState<string>(preSelectedFiscalId || '')
  const [selectedHospitalIds, setSelectedHospitalIds] = useState<string[]>(
    preSelectedHospitalId ? [preSelectedHospitalId] : [],
  )
  const [filterTipo, setFilterTipo] = useState<string>('todos')
  const [searchEmpreendimento, setSearchEmpreendimento] = useState<string>('')
  const [observacao, setObservacao] = useState<string>('')
  const [prazo, setPrazo] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Sync props when modal opens
  React.useEffect(() => {
    if (open) {
      if (preSelectedFiscalId) setSelectedFiscalId(preSelectedFiscalId)
      if (preSelectedHospitalId) setSelectedHospitalIds([preSelectedHospitalId])
      setSearchEmpreendimento('')
      setObservacao('')
      setPrazo('')
    }
  }, [open, preSelectedFiscalId, preSelectedHospitalId])

  // Filtered available hospitais
  const filteredHospitais = useMemo(() => {
    return hospitais.filter((h) => {
      const hTipo = (h.tipo || 'Hospital').trim().toLowerCase()
      const matchTipo = filterTipo === 'todos' || hTipo === filterTipo.trim().toLowerCase()
      if (!matchTipo) return false

      if (!searchEmpreendimento.trim()) return true
      const q = searchEmpreendimento.toLowerCase()
      return (
        h.nome.toLowerCase().includes(q) ||
        h.municipio.toLowerCase().includes(q) ||
        h.cnes.includes(q)
      )
    })
  }, [hospitais, filterTipo, searchEmpreendimento])

  const toggleHospitalSelection = (id: string) => {
    setSelectedHospitalIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const selectAllFiltered = () => {
    const idsToAdd = filteredHospitais.map((h) => h.id)
    setSelectedHospitalIds((prev) => Array.from(new Set([...prev, ...idsToAdd])))
  }

  const clearSelection = () => {
    setSelectedHospitalIds([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFiscalId) {
      toast({
        title: 'Selecione o Fiscal',
        description: 'É necessário escolher o fiscal responsável pela atribuição.',
        variant: 'destructive',
      })
      return
    }

    if (selectedHospitalIds.length === 0) {
      toast({
        title: 'Selecione os Empreendimentos',
        description: 'Escolha ao menos um empreendimento para atribuir.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)
      await atribuicoesService.assignHospitalsToFiscal(
        selectedFiscalId,
        selectedHospitalIds,
        undefined,
        observacao,
        prazo || undefined,
      )

      const fiscalName =
        fiscais.find((f) => f.id === selectedFiscalId)?.name || 'Fiscal selecionado'

      toast({
        title: 'Atribuição realizada com sucesso!',
        description: `${selectedHospitalIds.length} empreendimento(s) atribuído(s) para ${fiscalName}.`,
      })

      await onSuccess()
      onOpenChange(false)
      setSelectedHospitalIds([])
      setObservacao('')
      setPrazo('')
    } catch (err) {
      console.error('Erro ao atribuir fiscalização:', err)
      toast({
        title: 'Erro ao salvar atribuição',
        description: 'Não foi possível registrar as atribuições no sistema.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedFiscal = fiscais.find((f) => f.id === selectedFiscalId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white border-[#D3DFE9] p-0 overflow-hidden sm:rounded-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-[#004B8D] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5 text-[#E5A812]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                Atribuir Fiscalização Técnica
              </DialogTitle>
              <DialogDescription className="text-xs text-blue-100">
                Selecione um fiscal e os empreendimentos (hospitais, fazendas, clínicas, etc.) que
                ele deve vistoriar.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* 1. Seleção do Fiscal */}
          <div className="space-y-1.5">
            <Label
              htmlFor="fiscal-select"
              className="text-xs font-bold text-[#102A43] flex items-center gap-1.5"
            >
              <Users className="w-4 h-4 text-[#004B8D]" />
              Fiscal Responsável <span className="text-rose-600">*</span>
            </Label>
            <Select value={selectedFiscalId} onValueChange={setSelectedFiscalId}>
              <SelectTrigger
                id="fiscal-select"
                className="h-10 border-[#D3DFE9] bg-white text-xs sm:text-sm"
              >
                <SelectValue placeholder="Selecione o fiscal da equipe..." />
              </SelectTrigger>
              <SelectContent>
                {fiscais.length === 0 ? (
                  <div className="p-3 text-xs text-[#627D98] text-center">
                    Nenhum usuário aprovado encontrado.
                  </div>
                ) : (
                  fiscais.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#102A43]">{f.name}</span>
                        <span className="text-xs text-[#627D98]">({f.email})</span>
                        <Badge className="text-[10px] bg-[#E8F1F8] text-[#004B8D] border-0 py-0">
                          {f.role === 'admin' ? 'Admin / Fiscal' : 'Fiscal'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Seleção Múltipla de Empreendimentos */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Label className="text-xs font-bold text-[#102A43] flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#004B8D]" />
                Selecione os Empreendimentos ({selectedHospitalIds.length} selecionado(s)){' '}
                <span className="text-rose-600">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllFiltered}
                  className="text-xs h-7 px-2 text-[#004B8D] hover:bg-[#E8F1F8]"
                >
                  Selecionar visíveis ({filteredHospitais.length})
                </Button>
                {selectedHospitalIds.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-xs h-7 px-2 text-rose-600 hover:bg-rose-50"
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {/* Filter by Tipo & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Filtrar por nome, município, CNES..."
                  value={searchEmpreendimento}
                  onChange={(e) => setSearchEmpreendimento(e.target.value)}
                  className="h-8 pl-8 text-xs border-[#D3DFE9]"
                />
              </div>

              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="h-8 border-[#D3DFE9] text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <Layers className="w-3 h-3 text-[#004B8D]" />
                    <span className="text-[#627D98]">Tipo:</span>
                    <SelectValue />
                  </div>
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

            {/* Scrollable List of Checkboxes */}
            <div className="border border-[#D3DFE9] rounded-xl max-h-56 overflow-y-auto divide-y divide-[#D3DFE9] bg-[#F4F6F9]/40 p-1">
              {filteredHospitais.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#627D98]">
                  Nenhum empreendimento corresponde aos filtros.
                </div>
              ) : (
                filteredHospitais.map((h) => {
                  const isChecked = selectedHospitalIds.includes(h.id)
                  return (
                    <div
                      key={h.id}
                      onClick={() => toggleHospitalSelection(h.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-xs ${
                        isChecked
                          ? 'bg-[#E8F1F8] border border-[#004B8D]/30'
                          : 'hover:bg-white bg-white/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-[#004B8D] shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-[#829AB1] shrink-0" />
                        )}
                        <div className="flex flex-col min-w-0">
                          <span
                            className={`font-semibold truncate ${isChecked ? 'text-[#004B8D]' : 'text-[#102A43]'}`}
                          >
                            {h.nome}
                          </span>
                          <span className="text-[11px] text-[#627D98]">
                            {h.municipio} • CNES: {h.cnes}
                          </span>
                        </div>
                      </div>

                      <Badge className="bg-white text-[#004B8D] border border-[#D3DFE9] text-[10px] font-semibold shrink-0">
                        {h.tipo || 'Hospital'}
                      </Badge>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* 3. Prazo e Observações Opcionais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label
                htmlFor="prazo-input"
                className="text-xs font-bold text-[#102A43] flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-[#004B8D]" />
                Prazo Limite para Conclusão (Opcional)
              </Label>
              <Input
                id="prazo-input"
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="h-9 border-[#D3DFE9] text-xs bg-white"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="obs-input" className="text-xs font-bold text-[#102A43]">
                Observações ou Instruções Especiais (Opcional)
              </Label>
              <Textarea
                id="obs-input"
                rows={2}
                placeholder="Ex: Priorizar verificação do grupo gerador e subestação..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="border-[#D3DFE9] text-xs resize-none bg-white"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <DialogFooter className="p-4 sm:px-6 bg-[#F4F6F9] border-t border-[#D3DFE9] flex flex-row items-center justify-between">
          <div className="text-xs text-[#486581]">
            {selectedHospitalIds.length > 0 && selectedFiscal ? (
              <span>
                <strong>{selectedHospitalIds.length}</strong> unidade(s) serão atribuídas a{' '}
                <strong>{selectedFiscal.name}</strong>
              </span>
            ) : (
              <span className="text-[#829AB1]">Selecione o fiscal e os empreendimentos</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-[#D3DFE9] text-[#486581] text-xs h-9 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedFiscalId || selectedHospitalIds.length === 0 || isSubmitting}
              className="bg-[#004B8D] hover:bg-[#003666] text-white font-bold text-xs h-9 px-4 cursor-pointer shadow-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Atribuindo...
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  Confirmar Atribuição ({selectedHospitalIds.length})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
