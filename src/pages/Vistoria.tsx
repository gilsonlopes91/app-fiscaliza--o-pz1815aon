import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Upload,
  Camera,
  Shield,
  HelpCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  X,
  FileText,
  AlertCircle,
  Save,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { hospitaisService, Hospital } from '@/services/hospitais'
import { categoriasVistoriaService, CategoriaVistoria } from '@/services/categoriasVistoria'
import {
  vistoriasService,
  Vistoria,
  VistoriaItem,
  VistoriaItemFormData,
  calculateItemSituacao,
  SituacaoChecklist,
} from '@/services/vistorias'
import { PhotoUploadSection } from '@/components/PhotoUploadSection'
import { NovaVistoriaDialog } from '@/components/NovaVistoriaDialog'
import { VistoriaCard } from '@/components/VistoriaCard'
import { useToast } from '@/hooks/use-toast'
import { formatCNPJ, formatCNES } from '@/lib/formatters'

export default function VistoriaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const urlHospitalId = searchParams.get('hospitalId')
  const urlVistoriaId = searchParams.get('vistoriaId')

  // Global states
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [categorias, setCategorias] = useState<CategoriaVistoria[]>([])
  const [openVistorias, setOpenVistorias] = useState<Vistoria[]>([])
  const [allVistoriaItens, setAllVistoriaItens] = useState<VistoriaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Active Vistoria Selection
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(urlHospitalId || '')
  const [currentVistoria, setCurrentVistoria] = useState<Vistoria | null>(null)
  const [vistoriaItens, setVistoriaItens] = useState<VistoriaItem[]>([])
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(false)

  // Local Form state for each category checklist item
  const [itemForms, setItemForms] = useState<Record<string, VistoriaItemFormData>>({})
  const [pendingPhotos, setPendingPhotos] = useState<Record<string, File[]>>({})
  const [deletedPhotos, setDeletedPhotos] = useState<Record<string, string[]>>({})
  const [savingCategoryIds, setSavingCategoryIds] = useState<Record<string, boolean>>({})

  // Modal for new inspection
  const [isNovaVistoriaOpen, setIsNovaVistoriaOpen] = useState(false)

  // Open inspection list search
  const [searchOpenVistorias, setSearchOpenVistorias] = useState('')

  useEffect(() => {
    document.title = 'Vistoria e Checklist · CREA-PI Fiscalização'
  }, [])

  // 1. Initial load of Hospitais, Categorias, and Open Vistorias
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [hospList, catList, openList] = await Promise.all([
        hospitaisService.getAll(),
        categoriasVistoriaService.getAll(),
        vistoriasService.getOpenVistorias(),
      ])
      setHospitais(hospList)
      setCategorias(catList)
      setOpenVistorias(openList)
    } catch (err) {
      console.error('Erro ao carregar dados de vistoria:', err)
      toast({
        title: 'Erro ao carregar vistoria',
        description: 'Não foi possível carregar os dados do servidor.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // 2. When hospital is selected, load or create its vistoria & items
  const loadVistoriaForHospital = useCallback(
    async (hospId: string, specificVistoriaId?: string | null) => {
      if (!hospId) {
        setCurrentVistoria(null)
        setVistoriaItens([])
        setItemForms({})
        setPendingPhotos({})
        setDeletedPhotos({})
        return
      }

      try {
        setIsLoadingChecklist(true)
        let vistoria: Vistoria | null = null

        if (specificVistoriaId) {
          try {
            vistoria = await vistoriasService.getById(specificVistoriaId)
          } catch {
            // fallback
          }
        }

        if (!vistoria) {
          vistoria = await vistoriasService.getOrCreateForHospital(hospId)
        }

        setCurrentVistoria(vistoria)

        // Load items for this vistoria
        const items = await vistoriasService.getItensByVistoria(vistoria.id)
        setVistoriaItens(items)

        // Initialize form states
        const initialForm: Record<string, VistoriaItemFormData> = {}
        items.forEach((item) => {
          initialForm[item.categoria] = {
            possuiSistema: item.possuiSistema || '',
            servicoPeriodico: item.servicoPeriodico || '',
            prestadorServico: item.prestadorServico || '',
            numeroArt: item.numeroArt || '',
            dataUltimaVerificacao: item.dataUltimaVerificacao
              ? item.dataUltimaVerificacao.split('T')[0]
              : '',
          }
        })
        setItemForms(initialForm)
        setPendingPhotos({})
        setDeletedPhotos({})
      } catch (err) {
        console.error('Erro ao carregar vistoria do hospital:', err)
        toast({
          title: 'Erro ao carregar vistoria',
          description: 'Não foi possível buscar a vistoria e checklist da unidade.',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingChecklist(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    if (selectedHospitalId) {
      loadVistoriaForHospital(selectedHospitalId, urlVistoriaId)
    }
  }, [selectedHospitalId, urlVistoriaId, loadVistoriaForHospital])

  // Handle Hospital Selection dropdown
  const handleSelectHospital = (hospId: string) => {
    setSelectedHospitalId(hospId)
    setSearchParams(hospId ? { hospitalId: hospId } : {})
  }

  // Active Hospital Entity
  const selectedHospital = useMemo(() => {
    return hospitais.find((h) => h.id === selectedHospitalId) || null
  }, [hospitais, selectedHospitalId])

  // Update a form field for a category
  const handleFieldChange = (
    categoriaId: string,
    field: keyof VistoriaItemFormData,
    value: any,
  ) => {
    setItemForms((prev) => ({
      ...prev,
      [categoriaId]: {
        ...prev[categoriaId],
        [field]: value,
      },
    }))
  }

  // Add pending photo files
  const handleAddPendingPhotos = (categoriaId: string, files: File[]) => {
    setPendingPhotos((prev) => ({
      ...prev,
      [categoriaId]: [...(prev[categoriaId] || []), ...files],
    }))
  }

  // Remove pending photo file
  const handleRemovePendingPhoto = (categoriaId: string, index: number) => {
    setPendingPhotos((prev) => {
      const current = [...(prev[categoriaId] || [])]
      current.splice(index, 1)
      return { ...prev, [categoriaId]: current }
    })
  }

  // Mark existing photo for deletion
  const handleDeleteExistingPhoto = (categoriaId: string, filename: string) => {
    setDeletedPhotos((prev) => ({
      ...prev,
      [categoriaId]: [...(prev[categoriaId] || []), filename],
    }))
    // Also remove from local vistoriaItens display
    setVistoriaItens((prev) =>
      prev.map((item) => {
        if (item.categoria === categoriaId && item.fotos) {
          return {
            ...item,
            fotos: item.fotos.filter((f) => f !== filename),
          }
        }
        return item
      }),
    )
  }

  // Save Item to Backend
  const handleSaveItem = async (cat: CategoriaVistoria) => {
    if (!currentVistoria || !selectedHospitalId) return

    const formData = itemForms[cat.id] || {
      possuiSistema: '',
      servicoPeriodico: '',
      prestadorServico: '',
      numeroArt: '',
      dataUltimaVerificacao: '',
    }

    const existingItem = vistoriaItens.find((i) => i.categoria === cat.id)
    const newFiles = pendingPhotos[cat.id] || []
    const deletedNames = deletedPhotos[cat.id] || []

    try {
      setSavingCategoryIds((prev) => ({ ...prev, [cat.id]: true }))

      const saved = await vistoriasService.saveItem(
        currentVistoria.id,
        selectedHospitalId,
        cat.id,
        formData,
        cat,
        existingItem?.id,
        newFiles.length > 0 ? newFiles : undefined,
        deletedNames.length > 0 ? deletedNames : undefined,
      )

      // Update local items state
      setVistoriaItens((prev) => {
        const index = prev.findIndex((i) => i.categoria === cat.id)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = saved
          return updated
        }
        return [...prev, saved]
      })

      // Clear pending/deleted tracking for this category
      setPendingPhotos((prev) => ({ ...prev, [cat.id]: [] }))
      setDeletedPhotos((prev) => ({ ...prev, [cat.id]: [] }))

      toast({
        title: 'Item salvo com sucesso!',
        description: `Informações de "${cat.nome}" foram sincronizadas.`,
      })
    } catch (err) {
      console.error('Erro ao salvar item:', err)
      toast({
        title: 'Erro ao salvar item',
        description: 'Não foi possível salvar o item da vistoria.',
        variant: 'destructive',
      })
    } finally {
      setSavingCategoryIds((prev) => ({ ...prev, [cat.id]: false }))
    }
  }

  // Calculate situation summary for the active vistoria
  const stats = useMemo(() => {
    let conformeCount = 0
    let vencidoCount = 0
    let naoSeAplicaCount = 0
    let pendenteCount = 0

    categorias.forEach((cat) => {
      const item = vistoriaItens.find((i) => i.categoria === cat.id)
      const form = itemForms[cat.id]

      let situacao: SituacaoChecklist = null

      if (form) {
        situacao = calculateItemSituacao(form, cat)
      } else if (item) {
        situacao = item.situacaoCalculada || null
      }

      if (situacao === 'conforme') conformeCount++
      else if (situacao === 'vencido') vencidoCount++
      else if (situacao === 'não se aplica') naoSeAplicaCount++
      else pendenteCount++
    })

    return {
      total: categorias.length,
      conforme: conformeCount,
      vencido: vencidoCount,
      naoSeAplica: naoSeAplicaCount,
      pendente: pendenteCount,
    }
  }, [categorias, vistoriaItens, itemForms])

  // Filter open vistorias for the open list view
  const filteredOpenVistorias = useMemo(() => {
    if (!searchOpenVistorias.trim()) return openVistorias
    const q = searchOpenVistorias.toLowerCase()
    return openVistorias.filter(
      (v) =>
        v.expand?.hospital?.nome.toLowerCase().includes(q) ||
        v.expand?.hospital?.municipio.toLowerCase().includes(q) ||
        v.expand?.hospital?.cnes.includes(q),
    )
  }, [openVistorias, searchOpenVistorias])

  return (
    <div className="animate-page-enter space-y-8 pb-20">
      {/* 1. Header with Nova Vistoria button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D3DFE9] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] sm:text-[28px] font-bold text-[#102A43] tracking-tight leading-tight">
              Vistorias & Checklist de Fiscalização
            </h1>
          </div>
          <p className="text-sm text-[#486581] mt-0.5">
            Preenchimento técnico das conformidades, exigências de ART, fotos e situação regulatória
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <Button
            onClick={() => setIsNovaVistoriaOpen(true)}
            className="bg-[#004B8D] hover:bg-[#003666] text-white shadow-sm font-semibold h-10 px-4 cursor-pointer gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Nova Vistoria
          </Button>
          <Button
            variant="outline"
            onClick={loadInitialData}
            disabled={isLoading}
            className="border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8] font-semibold h-10 px-3 cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 2. Seleção do Hospital em Atendimento */}
      <div className="bg-white rounded-2xl border border-[#D3DFE9] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Label
            htmlFor="select-hospital"
            className="text-sm font-bold text-[#102A43] flex items-center gap-2"
          >
            <Building2 className="w-4 h-4 text-[#004B8D]" />
            Selecione o Estabelecimento para Vistoriar:
          </Label>

          {selectedHospital && (
            <Badge className="bg-[#E8F1F8] text-[#004B8D] hover:bg-[#E8F1F8] text-xs font-semibold self-start sm:self-auto border-0">
              {selectedHospital.tipo || 'Hospital'} • CNES: {selectedHospital.cnes}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Select value={selectedHospitalId} onValueChange={handleSelectHospital}>
              <SelectTrigger
                id="select-hospital"
                className="h-11 border-[#D3DFE9] bg-[#F4F6F9]/50 text-sm focus:ring-[#004B8D]"
              >
                <SelectValue placeholder="Selecione um hospital ou estabelecimento..." />
              </SelectTrigger>
              <SelectContent>
                {hospitais.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#102A43]">{h.nome}</span>
                      <span className="text-xs text-[#627D98]">
                        ({h.municipio} • CNES: {h.cnes})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedHospitalId && (
            <Button
              variant="outline"
              onClick={() => handleSelectHospital('')}
              className="border-[#D3DFE9] text-[#486581] hover:text-[#102A43] h-11 text-xs gap-1.5"
            >
              <X className="w-4 h-4" />
              Limpar seleção
            </Button>
          )}
        </div>

        {/* Selected Hospital Info Card */}
        {selectedHospital && (
          <div className="mt-4 p-4 rounded-xl bg-[#F4F6F9] border border-[#D3DFE9] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[#627D98] block">Município:</span>
              <span className="font-semibold text-[#102A43]">{selectedHospital.municipio}</span>
            </div>
            <div>
              <span className="text-[#627D98] block">CNPJ:</span>
              <span className="font-mono text-[#102A43]">
                {selectedHospital.cnpj ? formatCNPJ(selectedHospital.cnpj) : 'Não informado'}
              </span>
            </div>
            <div>
              <span className="text-[#627D98] block">Responsável pelas informações:</span>
              <span className="font-semibold text-[#102A43]">
                {selectedHospital.responsavel || 'Não informado'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Resumo de Pendências (Card no Topo) se hospital estiver selecionado */}
      {selectedHospitalId && (
        <div className="bg-white rounded-2xl border border-[#D3DFE9] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#D3DFE9] pb-3">
            <h3 className="text-base font-bold text-[#102A43] flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#004B8D]" />
              Resumo Técnico da Vistoria
            </h3>
            <span className="text-xs text-[#627D98] font-medium">
              {stats.total} itens regulatórios cadastrados
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Conforme
              </div>
              <div className="text-2xl font-bold text-emerald-900">{stats.conforme}</div>
              <div className="text-[11px] text-emerald-700">Sistemas regulares</div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
              <div className="flex items-center gap-1.5 text-rose-800 text-xs font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Vencido
              </div>
              <div className="text-2xl font-bold text-rose-900">{stats.vencido}</div>
              <div className="text-[11px] text-rose-700">Prazo expirado</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-[#D3DFE9]">
              <div className="flex items-center gap-1.5 text-[#486581] text-xs font-bold mb-1">
                <CheckCircle className="w-4 h-4 text-[#627D98]" />
                Não se aplica
              </div>
              <div className="text-2xl font-bold text-[#102A43]">{stats.naoSeAplica}</div>
              <div className="text-[11px] text-[#627D98]">Não possui sistema</div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold mb-1">
                <Clock className="w-4 h-4 text-amber-600" />
                Pendente
              </div>
              <div className="text-2xl font-bold text-amber-900">{stats.pendente}</div>
              <div className="text-[11px] text-amber-700">Ainda não preenchido</div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Checklist Expansível (Accordion) com Categorias Técnicas */}
      {selectedHospitalId ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#102A43] flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-[#004B8D]" />
                Checklist de Fiscalização Técnica
              </h2>
              <p className="text-xs text-[#486581]">
                Abra cada categoria para preencher respostas, anotação de ART e registrar fotos.
              </p>
            </div>

            {isLoadingChecklist && (
              <div className="flex items-center gap-1.5 text-xs text-[#004B8D] font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando itens...
              </div>
            )}
          </div>

          {categorias.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-[#D3DFE9]">
              <p className="text-sm text-[#486581]">Nenhuma categoria técnica cadastrada.</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-3">
              {categorias.map((cat, idx) => {
                const item = vistoriaItens.find((i) => i.categoria === cat.id)
                const form = itemForms[cat.id] || {
                  possuiSistema: '',
                  servicoPeriodico: '',
                  prestadorServico: '',
                  numeroArt: '',
                  dataUltimaVerificacao: '',
                }

                const situacao = calculateItemSituacao(form, cat)
                const isSaving = savingCategoryIds[cat.id] || false
                const pending = pendingPhotos[cat.id] || []

                return (
                  <AccordionItem
                    key={cat.id}
                    value={cat.id}
                    className="border border-[#D3DFE9] bg-white rounded-xl overflow-hidden shadow-xs data-[state=open]:border-[#004B8D]/60 transition-all"
                  >
                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-slate-50/70">
                      <div className="flex flex-1 items-center justify-between gap-4 text-left pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#E8F1F8] text-[#004B8D] font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-[#102A43]">{cat.nome}</h4>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#627D98] mt-0.5">
                              <span>Exige ART: {cat.exigeArt ? 'Sim' : 'Não'}</span>
                              {cat.periodicidadeDias && cat.periodicidadeDias > 0 && (
                                <>
                                  <span>•</span>
                                  <span>Periodicidade: {cat.periodicidadeDias} dias</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Situacao Badge on Header */}
                        <div>
                          {situacao === 'conforme' && (
                            <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Conforme
                            </Badge>
                          )}
                          {situacao === 'vencido' && (
                            <Badge className="bg-rose-50 text-rose-800 border border-rose-300 text-xs font-bold gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              Vencido
                            </Badge>
                          )}
                          {situacao === 'não se aplica' && (
                            <Badge className="bg-slate-100 text-[#486581] border border-[#D3DFE9] text-xs font-medium">
                              Não se aplica
                            </Badge>
                          )}
                          {!situacao && (
                            <Badge className="bg-amber-50 text-amber-800 border border-amber-300 text-xs font-medium gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pendente
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-5 pb-6 pt-2 border-t border-[#D3DFE9]/70 bg-slate-50/30">
                      <div className="space-y-5 pt-3">
                        {/* 1. Possui o sistema / instalação? */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-[#102A43]">
                            O estabelecimento possui este sistema / instalação?{' '}
                            <span className="text-rose-600">*</span>
                          </Label>
                          <div className="flex items-center gap-3">
                            <Button
                              type="button"
                              size="sm"
                              variant={form.possuiSistema === 'Sim' ? 'default' : 'outline'}
                              onClick={() => handleFieldChange(cat.id, 'possuiSistema', 'Sim')}
                              className={`h-9 px-5 text-xs font-bold ${
                                form.possuiSistema === 'Sim'
                                  ? 'bg-[#004B8D] text-white'
                                  : 'border-[#D3DFE9] text-[#486581]'
                              }`}
                            >
                              Sim
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={form.possuiSistema === 'Não' ? 'default' : 'outline'}
                              onClick={() => handleFieldChange(cat.id, 'possuiSistema', 'Não')}
                              className={`h-9 px-5 text-xs font-bold ${
                                form.possuiSistema === 'Não'
                                  ? 'bg-slate-700 text-white'
                                  : 'border-[#D3DFE9] text-[#486581]'
                              }`}
                            >
                              Não
                            </Button>
                          </div>
                        </div>

                        {/* Fields if "Sim" */}
                        {form.possuiSistema === 'Sim' && (
                          <div className="p-4 rounded-xl bg-white border border-[#D3DFE9] space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Prestador do Serviço */}
                              <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-[#102A43]">
                                  Prestador do Serviço / Empresa Mantenedora
                                </Label>
                                <Input
                                  placeholder="Ex: Empresa de Engenharia Ltda"
                                  value={form.prestadorServico || ''}
                                  onChange={(e) =>
                                    handleFieldChange(cat.id, 'prestadorServico', e.target.value)
                                  }
                                  className="border-[#D3DFE9] text-xs h-9"
                                />
                              </div>

                              {/* Número da ART (Opcional) */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-bold text-[#102A43]">
                                    Número da ART (CREA)
                                  </Label>
                                  <span className="text-[10px] text-[#627D98] bg-[#F4F6F9] px-1.5 py-0.5 rounded border border-[#D3DFE9]">
                                    Opcional
                                  </span>
                                </div>
                                <Input
                                  placeholder="Ex: PI20240012345"
                                  value={form.numeroArt || ''}
                                  onChange={(e) =>
                                    handleFieldChange(cat.id, 'numeroArt', e.target.value)
                                  }
                                  className="border-[#D3DFE9] text-xs h-9 font-mono"
                                />
                              </div>

                              {/* Data da Última Verificação */}
                              <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-[#102A43]">
                                  Data da Última Verificação / Manutenção
                                </Label>
                                <Input
                                  type="date"
                                  value={form.dataUltimaVerificacao || ''}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      cat.id,
                                      'dataUltimaVerificacao',
                                      e.target.value,
                                    )
                                  }
                                  className="border-[#D3DFE9] text-xs h-9"
                                />
                              </div>

                              {/* Este serviço é feito periodicamente? */}
                              <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-[#102A43]">
                                  Este serviço é feito periodicamente?
                                </Label>
                                <Select
                                  value={form.servicoPeriodico || ''}
                                  onValueChange={(val) =>
                                    handleFieldChange(cat.id, 'servicoPeriodico', val)
                                  }
                                >
                                  <SelectTrigger className="border-[#D3DFE9] text-xs h-9 bg-white">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Sim">Sim (periódico)</SelectItem>
                                    <SelectItem value="Não">Não (eventual/único)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Seção de Fotos (Até 3 por item) */}
                            <div className="pt-3 border-t border-[#D3DFE9]">
                              <PhotoUploadSection
                                itemId={item?.id}
                                existingPhotos={item?.fotos || []}
                                pendingFiles={pending}
                                onAddFiles={(files) => handleAddPendingPhotos(cat.id, files)}
                                onRemovePendingFile={(index) =>
                                  handleRemovePendingPhoto(cat.id, index)
                                }
                                onDeleteExistingPhoto={(filename) =>
                                  handleDeleteExistingPhoto(cat.id, filename)
                                }
                              />
                            </div>
                          </div>
                        )}

                        {/* Save Item Action Button */}
                        <div className="flex justify-end pt-2">
                          <Button
                            type="button"
                            onClick={() => handleSaveItem(cat)}
                            disabled={isSaving}
                            className="bg-[#004B8D] hover:bg-[#003666] text-white font-bold text-xs h-9 px-4 gap-1.5 cursor-pointer shadow-xs"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5" />
                                Salvar Respostas de {cat.nome}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </div>
      ) : (
        /* 5. Lista de Vistorias Abertas (Cards clicáveis) quando nenhum hospital foi selecionado */
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#102A43]">
                Vistorias em Andamento no CREA-PI
              </h2>
              <p className="text-xs text-[#486581]">
                Selecione uma vistoria aberta abaixo ou escolha um hospital no seletor acima para
                iniciar
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#486581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                placeholder="Buscar vistoria aberta..."
                value={searchOpenVistorias}
                onChange={(e) => setSearchOpenVistorias(e.target.value)}
                className="pl-9 h-9 text-xs border-[#D3DFE9] focus-visible:ring-[#004B8D]"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-[#486581]">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#004B8D] mb-2" />
              <p className="text-xs font-semibold">Carregando vistorias abertas...</p>
            </div>
          ) : filteredOpenVistorias.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-[#D3DFE9] p-12 text-center space-y-3">
              <ClipboardCheck className="w-12 h-12 text-[#829AB1] mx-auto stroke-[1.5]" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#102A43]">
                  Nenhuma vistoria em andamento
                </h3>
                <p className="text-xs text-[#486581] max-w-sm mx-auto">
                  Utilize o botão &ldquo;Nova Vistoria&rdquo; ou o seletor acima para iniciar o
                  checklist técnico de um estabelecimento.
                </p>
              </div>
              <Button
                onClick={() => setIsNovaVistoriaOpen(true)}
                className="bg-[#004B8D] hover:bg-[#003666] text-white text-xs font-bold h-9 px-4 mt-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Criar Nova Vistoria
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOpenVistorias.map((vistoria) => (
                <VistoriaCard
                  key={vistoria.id}
                  vistoria={vistoria}
                  pendentesCount={0}
                  vencidosCount={0}
                  conformesCount={0}
                  totalItensCount={categorias.length}
                  onClick={() => {
                    if (vistoria.hospital) {
                      handleSelectHospital(vistoria.hospital)
                      setSearchParams({
                        hospitalId: vistoria.hospital,
                        vistoriaId: vistoria.id,
                      })
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nova Vistoria Dialog */}
      <NovaVistoriaDialog
        open={isNovaVistoriaOpen}
        onOpenChange={setIsNovaVistoriaOpen}
        hospitais={hospitais}
        onSelectHospital={async (hospId) => {
          await loadInitialData()
          handleSelectHospital(hospId)
        }}
      />
    </div>
  )
}
