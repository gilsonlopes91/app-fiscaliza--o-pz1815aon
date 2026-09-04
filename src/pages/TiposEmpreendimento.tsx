import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Stethoscope,
  FlaskConical,
  Scan,
  HeartPulse,
  Activity,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  Building,
  Layers,
  Sparkles,
  RefreshCw,
  X,
  Briefcase,
  Store,
  Factory,
  Hotel,
  Tractor,
  Wheat,
  Sun,
  Zap,
  Flame,
  Droplets,
  HardHat,
  Warehouse,
  Radio,
  Fuel,
  Wrench,
  Trees,
  Truck,
  ShieldAlert,
  FileSpreadsheet,
  Check,
  ChevronRight,
  ArrowRight,
  FileCheck2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  tiposEmpreendimentoService,
  TipoEmpreendimento,
  TipoEmpreendimentoFormData,
} from '@/services/tiposEmpreendimento'
import { categoriasVistoriaService, CategoriaVistoria } from '@/services/categoriasVistoria'
import { hospitaisService, Hospital } from '@/services/hospitais'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TipoEmpreendimentoImportCsv } from '@/components/TipoEmpreendimentoImportCsv'

// Comprehensive Icon registry matching CREA-PI engineering, agronomy, industry & health identity
export const ICON_OPTIONS = [
  { id: 'Building2', label: 'Hospital / Prédio', icon: Building2, category: 'Saúde & Edificações' },
  { id: 'Tractor', label: 'Fazenda / Agro', icon: Tractor, category: 'Agronomia & Campo' },
  { id: 'Wheat', label: 'Agricultura / Grãos', icon: Wheat, category: 'Agronomia & Campo' },
  { id: 'Trees', label: 'Florestal / Agropecuária', icon: Trees, category: 'Agronomia & Campo' },
  { id: 'Factory', label: 'Indústria / Fábrica', icon: Factory, category: 'Indústria & Energia' },
  { id: 'Sun', label: 'Energia Solar', icon: Sun, category: 'Indústria & Energia' },
  { id: 'Zap', label: 'Energia Elétrica / Eólica', icon: Zap, category: 'Indústria & Energia' },
  { id: 'Fuel', label: 'Posto de Combustíveis / GNV', icon: Fuel, category: 'Infraestrutura' },
  {
    id: 'Droplets',
    label: 'Saneamento / Tratamento de Água',
    icon: Droplets,
    category: 'Infraestrutura',
  },
  { id: 'HardHat', label: 'Construção Civil / Obra', icon: HardHat, category: 'Construção' },
  {
    id: 'Warehouse',
    label: 'Galpão / Centro de Distribuição',
    icon: Warehouse,
    category: 'Infraestrutura',
  },
  { id: 'Radio', label: 'Telecom / Antenas', icon: Radio, category: 'Tecnologia' },
  {
    id: 'Stethoscope',
    label: 'Clínica / Saúde',
    icon: Stethoscope,
    category: 'Saúde & Edificações',
  },
  { id: 'FlaskConical', label: 'Laboratório', icon: FlaskConical, category: 'Saúde & Edificações' },
  { id: 'Scan', label: 'Diagnóstico por Imagem', icon: Scan, category: 'Saúde & Edificações' },
  {
    id: 'HeartPulse',
    label: 'Posto de Saúde / UBS',
    icon: HeartPulse,
    category: 'Saúde & Edificações',
  },
  {
    id: 'Activity',
    label: 'Pronto Atendimento / UPA',
    icon: Activity,
    category: 'Saúde & Edificações',
  },
  { id: 'Building', label: 'Complexo Corporativo', icon: Building, category: 'Construção' },
  { id: 'Store', label: 'Comércio / Distribuidora', icon: Store, category: 'Infraestrutura' },
  { id: 'Briefcase', label: 'Escritório Técnico', icon: Briefcase, category: 'Construção' },
  { id: 'Wrench', label: 'Oficina / Manutenção', icon: Wrench, category: 'Indústria & Energia' },
  { id: 'Truck', label: 'Transporte / Logística', icon: Truck, category: 'Infraestrutura' },
  { id: 'Hotel', label: 'Hotel / Pousada', icon: Hotel, category: 'Construção' },
  {
    id: 'ShieldAlert',
    label: 'Segurança / Prevenção',
    icon: ShieldAlert,
    category: 'Infraestrutura',
  },
]

export function getIconComponent(iconName?: string) {
  const found = ICON_OPTIONS.find((item) => item.id === iconName)
  return found ? found.icon : Building2
}

export default function TiposEmpreendimentoPage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  // Data states
  const [tipos, setTipos] = useState<TipoEmpreendimento[]>([])
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [categorias, setCategorias] = useState<CategoriaVistoria[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Sub-tabs: 'catalogo' vs 'importar' (importar visible only for admin)
  const [activeTab, setActiveTab] = useState<'catalogo' | 'importar'>('catalogo')

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')

  // Dialogs: Tipo Empreendimento
  const [isTipoModalOpen, setIsTipoModalOpen] = useState(false)
  const [editingTipo, setEditingTipo] = useState<TipoEmpreendimento | null>(null)
  const [tipoForm, setTipoForm] = useState<TipoEmpreendimentoFormData>({
    nome: '',
    icone: 'Building2',
    descricao: '',
  })
  const [tipoToDelete, setTipoToDelete] = useState<TipoEmpreendimento | null>(null)
  const [iconPickerFilter, setIconPickerFilter] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    document.title = 'Tipos de Empreendimento · CREA-PI Fiscalização'
  }, [])

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [tiposList, hospList, catList] = await Promise.all([
        tiposEmpreendimentoService.getAll(),
        hospitaisService.getAll(),
        categoriasVistoriaService.getAll(),
      ])
      setTipos(tiposList)
      setHospitais(hospList)
      setCategorias(catList)
    } catch (err) {
      console.error('Erro ao carregar tipos de empreendimento:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as informações do servidor.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Count registered units per Tipo
  const countPerTipo = useMemo(() => {
    const map = new Map<string, number>()
    hospitais.forEach((h) => {
      const t = (h.tipo || 'Hospital').trim()
      map.set(t.toLowerCase(), (map.get(t.toLowerCase()) || 0) + 1)
    })
    return map
  }, [hospitais])

  // Count checklist items per Tipo
  const checklistCountPerTipo = useMemo(() => {
    const map = new Map<string, number>()
    categorias.forEach((c) => {
      const t = (c.tipo || 'Hospital').trim()
      map.set(t.toLowerCase(), (map.get(t.toLowerCase()) || 0) + 1)
    })
    return map
  }, [categorias])

  // Filtered Tipos
  const filteredTipos = useMemo(() => {
    if (!searchQuery.trim()) return tipos
    const q = searchQuery.toLowerCase()
    return tipos.filter(
      (t) =>
        t.nome.toLowerCase().includes(q) || (t.descricao && t.descricao.toLowerCase().includes(q)),
    )
  }, [tipos, searchQuery])

  // Filtered icons for the visual picker
  const filteredIcons = useMemo(() => {
    if (!iconPickerFilter.trim()) return ICON_OPTIONS
    const q = iconPickerFilter.toLowerCase()
    return ICON_OPTIONS.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.id.toLowerCase().includes(q) ||
        (opt.category && opt.category.toLowerCase().includes(q)),
    )
  }, [iconPickerFilter])

  // Handlers for Tipo Empreendimento
  const handleOpenCreateTipo = () => {
    setEditingTipo(null)
    setTipoForm({ nome: '', icone: 'Building2', descricao: '' })
    setIconPickerFilter('')
    setIsTipoModalOpen(true)
  }

  const handleOpenEditTipo = (e: React.MouseEvent, t: TipoEmpreendimento) => {
    e.stopPropagation()
    setEditingTipo(t)
    setTipoForm({
      nome: t.nome,
      icone: t.icone || 'Building2',
      descricao: t.descricao || '',
    })
    setIconPickerFilter('')
    setIsTipoModalOpen(true)
  }

  const handleSaveTipo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tipoForm.nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome do tipo de empreendimento.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSaving(true)
      if (editingTipo) {
        const updated = await tiposEmpreendimentoService.update(editingTipo.id, tipoForm)
        setTipos((prev) => prev.map((item) => (item.id === editingTipo.id ? updated : item)))
        toast({
          title: 'Tipo atualizado com sucesso!',
          description: `O tipo "${updated.nome}" foi atualizado.`,
        })
      } else {
        const created = await tiposEmpreendimentoService.create(tipoForm)
        setTipos((prev) => [...prev, created])
        toast({
          title: 'Tipo criado com sucesso!',
          description: `O tipo "${created.nome}" foi cadastrado no catálogo.`,
        })
      }
      setIsTipoModalOpen(false)
    } catch (err: any) {
      console.error('Erro ao salvar tipo:', err)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível persistir as informações.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteTipo = async () => {
    if (!tipoToDelete) return
    const isStandardHospital = tipoToDelete.nome.toLowerCase() === 'hospital'
    if (isStandardHospital) {
      toast({
        title: 'Operação não permitida',
        description: 'O tipo "Hospital" é o padrão do sistema e não pode ser excluído.',
        variant: 'destructive',
      })
      setTipoToDelete(null)
      return
    }

    try {
      setIsSaving(true)
      await tiposEmpreendimentoService.delete(tipoToDelete.id)
      setTipos((prev) => prev.filter((item) => item.id !== tipoToDelete.id))
      toast({
        title: 'Tipo excluído',
        description: `O tipo "${tipoToDelete.nome}" foi removido do catálogo.`,
      })
      setTipoToDelete(null)
    } catch (err) {
      console.error('Erro ao excluir tipo:', err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o tipo de empreendimento.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCardClick = (tipo: TipoEmpreendimento) => {
    navigate(`/tipos-empreendimento/${tipo.id}`)
  }

  return (
    <div className="animate-page-enter space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] sm:text-[28px] font-bold text-[#102A43] tracking-tight leading-tight">
              Tipos de Empreendimento
            </h1>
          </div>
          <p className="text-sm text-[#486581] mt-0.5">
            Catálogo de empreendimentos fiscalizados pelo CREA-PI. Clique em um tipo para acessar
            suas unidades e checklist exclusivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {isAdmin && (
            <Button
              onClick={handleOpenCreateTipo}
              className="bg-[#004B8D] hover:bg-[#003666] text-white shadow-sm font-semibold h-10 px-4 cursor-pointer gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Novo Tipo de Empreendimento
            </Button>
          )}

          <Button
            variant="outline"
            onClick={loadData}
            disabled={isLoading}
            className="border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8] font-semibold h-10 px-3 cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Sub-tabs: Catálogo vs Importar CSV (CSV restrito para administradores) */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'catalogo' | 'importar')}
        className="w-full"
      >
        <div className="flex items-center justify-between border-b border-[#D3DFE9] pb-3 mb-6">
          <TabsList className="bg-[#E8F1F8] p-1 rounded-lg border border-[#D3DFE9]/80 h-auto">
            <TabsTrigger
              value="catalogo"
              className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white text-[#486581] font-semibold text-xs sm:text-sm py-1.5 px-3.5 rounded-md gap-2"
            >
              <Layers className="w-4 h-4" />
              Catálogo de Tipos ({tipos.length})
            </TabsTrigger>

            {isAdmin && (
              <TabsTrigger
                value="importar"
                className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white text-[#486581] font-semibold text-xs sm:text-sm py-1.5 px-3.5 rounded-md gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Importar Tipos via CSV
              </TabsTrigger>
            )}
          </TabsList>

          <span className="text-xs font-semibold text-[#627D98] hidden sm:inline">
            {filteredTipos.length} tipo(s) cadastrado(s)
          </span>
        </div>

        {/* TAB 1: CATÁLOGO DE TIPOS (SEM CHECKLIST EMBAIXO) */}
        <TabsContent value="catalogo" className="space-y-6 mt-0">
          <div className="flex flex-col sm:flex-row justify-between gap-3 items-stretch sm:items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#E8F1F8] flex items-center justify-center text-[#004B8D]">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#102A43]">
                  Empreendimentos Regulados pelo CREA-PI
                </h2>
                <p className="text-xs text-[#486581]">
                  Selecione um card para gerenciar as unidades cadastradas e o checklist de vistoria
                  daquele segmento.
                </p>
              </div>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#486581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                placeholder="Buscar tipo de empreendimento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs border-[#D3DFE9] focus-visible:ring-[#004B8D]"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-[#486581]">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#004B8D] mb-2" />
              <p className="text-xs font-semibold">Carregando catálogo de empreendimentos...</p>
            </div>
          ) : filteredTipos.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#D3DFE9] p-8 text-center space-y-3">
              <Building2 className="w-8 h-8 text-[#829AB1] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#102A43]">
                Nenhum tipo de empreendimento encontrado
              </p>
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="text-xs border-[#D3DFE9] text-[#004B8D] cursor-pointer"
                >
                  Limpar busca
                </Button>
                {isAdmin && (
                  <Button
                    size="sm"
                    onClick={handleOpenCreateTipo}
                    className="text-xs bg-[#004B8D] hover:bg-[#003666] text-white cursor-pointer"
                  >
                    Cadastrar Novo Tipo
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* Cards Grid - Each card opens its own type page */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredTipos.map((tipo) => {
                const IconComp = getIconComponent(tipo.icone)
                const unitCount = countPerTipo.get(tipo.nome.toLowerCase()) || 0
                const checklistCount = checklistCountPerTipo.get(tipo.nome.toLowerCase()) || 0
                const isStandardHospital = tipo.nome.trim().toLowerCase() === 'hospital'

                return (
                  <div
                    key={tipo.id}
                    onClick={() => handleCardClick(tipo)}
                    className="bg-white rounded-2xl border border-[#D3DFE9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-[#004B8D]/50 transition-all flex flex-col justify-between group cursor-pointer text-left"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E8F1F8] to-blue-100/60 text-[#004B8D] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 group-hover:bg-[#004B8D] group-hover:text-white transition-all">
                          <IconComp className="w-6 h-6 stroke-[2]" />
                        </div>

                        {isAdmin && (
                          <div
                            className="flex items-center gap-1 opacity-90"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => handleOpenEditTipo(e, tipo)}
                              className="h-8 w-8 p-0 text-[#004B8D] hover:bg-[#E8F1F8] cursor-pointer"
                              title="Editar tipo"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            {!isStandardHospital ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setTipoToDelete(tipo)
                                }}
                                className="h-8 w-8 p-0 text-[#829AB1] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Excluir tipo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            ) : (
                              <span
                                className="h-8 w-8 flex items-center justify-center text-[#A0AEC0] cursor-not-allowed"
                                title="Tipo padrão obrigatório não pode ser excluído"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#E5A812]" />
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-[#102A43] leading-tight group-hover:text-[#004B8D] transition-colors">
                            {tipo.nome}
                          </h3>
                        </div>
                        <p className="text-xs text-[#486581] mt-1.5 line-clamp-2 leading-relaxed">
                          {tipo.descricao ||
                            'Clique para visualizar as unidades e o checklist de fiscalização deste segmento.'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#D3DFE9]/70 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs text-[#486581]">
                        <span className="flex items-center gap-1.5 font-medium">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              unitCount > 0 ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                          <strong>{unitCount}</strong> {unitCount === 1 ? 'unidade' : 'unidades'}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#004B8D] bg-[#E8F1F8] px-2 py-0.5 rounded-md">
                          <FileCheck2 className="w-3 h-3" />
                          {checklistCount} {checklistCount === 1 ? 'item' : 'itens'} no checklist
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-[#004B8D] font-bold group-hover:translate-x-0.5 transition-transform">
                        <span>Acessar unidades e checklist</span>
                        <ChevronRight className="w-4 h-4 text-[#004B8D]" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: IMPORTAR CSV (Restrito para Admin) */}
        {isAdmin && (
          <TabsContent value="importar" className="mt-0">
            <TipoEmpreendimentoImportCsv
              existingTipos={tipos}
              onImportCompleted={(created, skipped) => {
                loadData()
                setActiveTab('catalogo')
              }}
              onCancel={() => setActiveTab('catalogo')}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* MODAL: CRIAR / EDITAR TIPO DE EMPREENDIMENTO COM SELEÇÃO VISUAL DE ÍCONES */}
      <Dialog open={isTipoModalOpen} onOpenChange={setIsTipoModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white border-[#D3DFE9] p-0 gap-0 sm:rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-[#D3DFE9] bg-[#F4F6F9]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8F1F8] flex items-center justify-center text-[#004B8D] shrink-0 shadow-xs">
                {React.createElement(getIconComponent(tipoForm.icone), {
                  className: 'w-5 h-5 stroke-[2.2]',
                })}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-[#102A43]">
                  {editingTipo ? 'Editar Tipo de Empreendimento' : 'Novo Tipo de Empreendimento'}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#486581] mt-0.5">
                  Defina o nome, ícone representativo e escopo fiscalizatório do empreendimento.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveTipo} className="p-6 space-y-5">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="tipo-nome" className="text-xs font-bold text-[#102A43]">
                Nome do Tipo de Empreendimento <span className="text-rose-600">*</span>
              </Label>
              <Input
                id="tipo-nome"
                placeholder="Ex: Fazendas / Agronegócio, Usina Solar, Indústria..."
                value={tipoForm.nome}
                onChange={(e) => setTipoForm({ ...tipoForm, nome: e.target.value })}
                className="border-[#D3DFE9] focus-visible:ring-[#004B8D] text-sm"
                required
              />
            </div>

            {/* Visual Icon Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-[#102A43] flex items-center gap-1.5">
                  <span>Ícone Representativo</span>
                  <Badge className="bg-[#E8F1F8] text-[#004B8D] text-[10px] font-bold border-0 px-2 py-0">
                    {tipoForm.icone || 'Building2'}
                  </Badge>
                </Label>
                <div className="relative w-44">
                  <Search className="w-3.5 h-3.5 text-[#829AB1] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    placeholder="Filtrar ícones..."
                    value={iconPickerFilter}
                    onChange={(e) => setIconPickerFilter(e.target.value)}
                    className="h-7 text-[11px] pl-7 border-[#D3DFE9]"
                  />
                </div>
              </div>

              {/* Grid of selectable icons */}
              <div className="border border-[#D3DFE9] rounded-xl p-3 bg-[#F4F6F9]/60 max-h-56 overflow-y-auto">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {filteredIcons.map((opt) => {
                    const OptIcon = opt.icon
                    const isSelected = (tipoForm.icone || 'Building2') === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTipoForm({ ...tipoForm, icone: opt.id })}
                        className={`relative p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-left cursor-pointer group ${
                          isSelected
                            ? 'bg-[#004B8D] text-white border-[#004B8D] shadow-sm ring-2 ring-[#004B8D]/30'
                            : 'bg-white text-[#334E68] border-[#D3DFE9] hover:border-[#004B8D]/60 hover:bg-[#E8F1F8]'
                        }`}
                        title={`${opt.label} (${opt.category})`}
                      >
                        {isSelected && (
                          <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#E5A812] text-[#102A43] flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                        <OptIcon
                          className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-[#004B8D]'}`}
                        />
                        <span
                          className={`text-[10px] text-center leading-tight line-clamp-2 px-0.5 ${
                            isSelected ? 'font-bold text-white' : 'font-medium'
                          }`}
                        >
                          {opt.label.split('/')[0].trim()}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label htmlFor="tipo-desc" className="text-xs font-bold text-[#102A43]">
                Descrição / Escopo de Fiscalização
              </Label>
              <Textarea
                id="tipo-desc"
                rows={3}
                placeholder="Ex: Instalações agroindustriais, pivôs de irrigação, silos, usinas de energia fotovoltaica..."
                value={tipoForm.descricao || ''}
                onChange={(e) => setTipoForm({ ...tipoForm, descricao: e.target.value })}
                className="border-[#D3DFE9] focus-visible:ring-[#004B8D] text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#D3DFE9]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTipoModalOpen(false)}
                className="border-[#D3DFE9] text-[#486581] cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#004B8D] hover:bg-[#003666] text-white font-bold cursor-pointer"
              >
                {isSaving ? 'Salvando...' : editingTipo ? 'Salvar Alterações' : 'Cadastrar Tipo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE TIPO */}
      <AlertDialog open={!!tipoToDelete} onOpenChange={(open) => !open && setTipoToDelete(null)}>
        <AlertDialogContent className="border-[#D3DFE9] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#102A43]">
              Excluir Tipo de Empreendimento
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#486581]">
              Tem certeza que deseja excluir o tipo &ldquo;{tipoToDelete?.nome}&rdquo;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#D3DFE9] text-[#486581] cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTipo}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
            >
              Excluir Tipo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
