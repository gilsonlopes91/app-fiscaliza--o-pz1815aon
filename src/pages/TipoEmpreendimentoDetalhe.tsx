import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  RefreshCw,
  FileCheck2,
  Edit2,
  Trash2,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  Sparkles,
  AlertCircle,
  Building,
  Calendar,
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
import { hospitaisService, Hospital, HospitalFormData } from '@/services/hospitais'
import {
  categoriasVistoriaService,
  CategoriaVistoria,
  CategoriaVistoriaFormData,
} from '@/services/categoriasVistoria'
import { tiposEmpreendimentoService, TipoEmpreendimento } from '@/services/tiposEmpreendimento'
import { getIconComponent } from '@/pages/TiposEmpreendimento'
import { HospitalCard } from '@/components/HospitalCard'
import { HospitalDetailSheet } from '@/components/HospitalDetailSheet'
import { HospitalFormDialog } from '@/components/HospitalFormDialog'
import { HospitalImportCsv } from '@/components/HospitalImportCsv'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export default function TipoEmpreendimentoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  // State
  const [tipo, setTipo] = useState<TipoEmpreendimento | null>(null)
  const [allTipos, setAllTipos] = useState<TipoEmpreendimento[]>([])
  const [unidades, setUnidades] = useState<Hospital[]>([])
  const [checklistCategorias, setChecklistCategorias] = useState<CategoriaVistoria[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Active main tab in this type's detail page: 'unidades' | 'checklist' | 'importar'
  const [activeTab, setActiveTab] = useState<'unidades' | 'checklist' | 'importar'>('unidades')

  // Search & Filter in Unidades
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>('todos')

  // Modals for Unidade / Hospital
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [hospitalToEdit, setHospitalToEdit] = useState<Hospital | null>(null)

  // Modals for Checklist / Categoria
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaVistoria | null>(null)
  const [categoriaForm, setCategoriaForm] = useState<CategoriaVistoriaFormData>({
    nome: '',
    tipo: '',
    exigeArt: true,
    periodicidadeDias: null,
  })
  const [categoriaToDelete, setCategoriaToDelete] = useState<CategoriaVistoria | null>(null)
  const [isSavingCategoria, setIsSavingCategoria] = useState(false)

  // Load Data
  const loadData = useCallback(async () => {
    if (!id) return
    try {
      setIsLoading(true)
      const tiposList = await tiposEmpreendimentoService.getAll()
      setAllTipos(tiposList)

      // Find matched tipo by ID or by URL encoded name
      const matched =
        tiposList.find((t) => t.id === id) ||
        tiposList.find((t) => t.nome.toLowerCase() === decodeURIComponent(id).toLowerCase())

      if (!matched) {
        toast({
          title: 'Tipo não encontrado',
          description: 'O tipo de empreendimento solicitado não existe.',
          variant: 'destructive',
        })
        navigate('/tipos-empreendimento')
        return
      }

      setTipo(matched)
      document.title = `${matched.nome} · CREA-PI Fiscalização`

      // Fetch units and checklist categories specific to this tipo
      const [allUnidades, allCategorias] = await Promise.all([
        hospitaisService.getAll(),
        categoriasVistoriaService.getAll(),
      ])

      const isHospitalType = matched.nome.trim().toLowerCase() === 'hospital'
      const filteredUnits = allUnidades.filter((u) => {
        const uTipo = u.tipo?.trim() || 'Hospital'
        return uTipo.toLowerCase() === matched.nome.trim().toLowerCase()
      })

      const filteredCats = allCategorias.filter((c) => {
        const cTipo = c.tipo?.trim() || (isHospitalType ? 'Hospital' : '')
        return cTipo.toLowerCase() === matched.nome.trim().toLowerCase()
      })

      setUnidades(filteredUnits)
      setChecklistCategorias(filteredCats)
    } catch (err) {
      console.error('Erro ao carregar dados do tipo:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as informações do tipo de empreendimento.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [id, navigate, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Municipios list
  const municipios = useMemo(() => {
    const list = unidades.map((h) => h.municipio).filter(Boolean)
    return Array.from(new Set(list)).sort()
  }, [unidades])

  // Filtered Unidades
  const filteredUnidades = useMemo(() => {
    return unidades.filter((h) => {
      const matchSearch =
        searchQuery === '' ||
        h.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.municipio.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.cnes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.cnpj && h.cnpj.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchMunicipio =
        selectedMunicipio === 'todos' ||
        h.municipio.toLowerCase() === selectedMunicipio.toLowerCase()

      return matchSearch && matchMunicipio
    })
  }, [unidades, searchQuery, selectedMunicipio])

  // Unit handlers
  const handleCreateUnidade = async (formData: HospitalFormData) => {
    if (!tipo) return
    try {
      const payload: HospitalFormData = {
        ...formData,
        tipo: tipo.nome,
      }
      const created = await hospitaisService.create(payload)
      setUnidades((prev) => [created, ...prev])
      toast({
        title: 'Unidade cadastrada com sucesso!',
        description: `"${created.nome}" foi cadastrada em ${tipo.nome}.`,
      })
    } catch (err) {
      console.error('Erro ao criar unidade:', err)
      toast({
        title: 'Erro ao cadastrar unidade',
        description: 'Não foi possível salvar o cadastro.',
        variant: 'destructive',
      })
      throw err
    }
  }

  const handleUpdateUnidade = async (unitId: string, formData: Partial<HospitalFormData>) => {
    try {
      const updated = await hospitaisService.update(unitId, formData)
      setUnidades((prev) => prev.map((u) => (u.id === unitId ? updated : u)))
      if (selectedHospital?.id === unitId) {
        setSelectedHospital(updated)
      }
      toast({
        title: 'Unidade atualizada!',
        description: 'Os dados foram atualizados com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao atualizar unidade:', err)
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      })
      throw err
    }
  }

  const handleDeleteUnidade = async (unitId: string) => {
    try {
      await hospitaisService.delete(unitId)
      setUnidades((prev) => prev.filter((u) => u.id !== unitId))
      toast({
        title: 'Unidade excluída',
        description: 'A unidade foi removida do sistema.',
      })
    } catch (err) {
      console.error('Erro ao excluir unidade:', err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover a unidade.',
        variant: 'destructive',
      })
      throw err
    }
  }

  const handleCardClick = (unit: Hospital) => {
    setSelectedHospital(unit)
    setIsDetailOpen(true)
  }

  // Checklist Category Handlers
  const handleOpenCreateCategoria = () => {
    if (!tipo) return
    setEditingCategoria(null)
    setCategoriaForm({
      nome: '',
      tipo: tipo.nome,
      exigeArt: true,
      periodicidadeDias: null,
    })
    setIsCategoriaModalOpen(true)
  }

  const handleOpenEditCategoria = (c: CategoriaVistoria) => {
    if (!tipo) return
    setEditingCategoria(c)
    setCategoriaForm({
      nome: c.nome,
      tipo: c.tipo || tipo.nome,
      exigeArt: c.exigeArt,
      periodicidadeDias: c.periodicidadeDias || null,
    })
    setIsCategoriaModalOpen(true)
  }

  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tipo || !categoriaForm.nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe a descrição do item de checklist.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSavingCategoria(true)
      if (editingCategoria) {
        const updated = await categoriasVistoriaService.update(editingCategoria.id, {
          ...categoriaForm,
          tipo: tipo.nome,
        })
        setChecklistCategorias((prev) =>
          prev.map((item) => (item.id === editingCategoria.id ? updated : item)),
        )
        toast({
          title: 'Item atualizado!',
          description: `"${updated.nome}" foi atualizado no checklist de ${tipo.nome}.`,
        })
      } else {
        const created = await categoriasVistoriaService.create({
          ...categoriaForm,
          tipo: tipo.nome,
        })
        setChecklistCategorias((prev) => [...prev, created])
        toast({
          title: 'Item adicionado ao checklist!',
          description: `"${created.nome}" agora faz parte do checklist de ${tipo.nome}.`,
        })
      }
      setIsCategoriaModalOpen(false)
    } catch (err) {
      console.error('Erro ao salvar item de checklist:', err)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o item no checklist.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingCategoria(false)
    }
  }

  const handleDeleteCategoria = async () => {
    if (!categoriaToDelete) return
    try {
      setIsSavingCategoria(true)
      await categoriasVistoriaService.delete(categoriaToDelete.id)
      setChecklistCategorias((prev) => prev.filter((item) => item.id !== categoriaToDelete.id))
      toast({
        title: 'Item removido',
        description: `O item "${categoriaToDelete.nome}" foi excluído do checklist.`,
      })
      setCategoriaToDelete(null)
    } catch (err) {
      console.error('Erro ao excluir item:', err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o item do checklist.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingCategoria(false)
    }
  }

  if (isLoading && !tipo) {
    return (
      <div className="py-20 text-center text-[#486581]">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#004B8D] mb-3" />
        <p className="text-sm font-semibold">Carregando dados do tipo de empreendimento...</p>
      </div>
    )
  }

  if (!tipo) return null

  const IconComp = getIconComponent(tipo.icone)
  const isStandardHospital = tipo.nome.trim().toLowerCase() === 'hospital'

  return (
    <div className="animate-page-enter space-y-6 pb-16">
      {/* Back button & Breadcrumb header */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/tipos-empreendimento')}
          className="text-[#004B8D] hover:bg-[#E8F1F8] hover:text-[#003666] font-semibold text-xs h-9 px-3 gap-2 -ml-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Catálogo de Tipos
        </Button>

        <Button
          variant="outline"
          onClick={loadData}
          disabled={isLoading}
          className="border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8] font-semibold h-9 px-3 cursor-pointer text-xs gap-1.5"
          title="Atualizar dados"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </Button>
      </div>

      {/* Hero Banner for this Tipo de Empreendimento */}
      <div className="bg-white rounded-2xl border border-[#D3DFE9] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E8F1F8] to-blue-100 text-[#004B8D] flex items-center justify-center shrink-0 shadow-sm border border-[#004B8D]/10">
            <IconComp className="w-7 h-7 stroke-[2]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-[#102A43] tracking-tight leading-tight">
                {tipo.nome}
              </h1>
              {isStandardHospital && (
                <Badge className="bg-[#E5A812] text-[#102A43] hover:bg-[#E5A812] text-[10px] font-bold px-2 py-0.5">
                  Padrão CREA-PI
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#486581] max-w-2xl leading-relaxed">
              {tipo.descricao ||
                'Empreendimento com vistoria técnica e checklist regulatório do CREA-PI.'}
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D3DFE9] w-full sm:w-auto">
          {isAdmin && (
            <Button
              onClick={() => {
                setHospitalToEdit(null)
                setIsFormOpen(true)
              }}
              className="bg-[#004B8D] hover:bg-[#003666] text-white shadow-sm font-semibold h-10 px-4 cursor-pointer gap-2 text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Nova Unidade
            </Button>
          )}

          <Button
            onClick={() => navigate(`/vistoria?tipo=${encodeURIComponent(tipo.nome)}`)}
            variant="outline"
            className="border-[#004B8D]/30 text-[#004B8D] hover:bg-[#E8F1F8] font-semibold h-10 px-3.5 gap-2 cursor-pointer text-xs sm:text-sm"
          >
            <ClipboardCheck className="w-4 h-4 text-[#004B8D]" />
            Ver Vistorias deste Tipo
          </Button>
        </div>
      </div>

      {/* Main Tabs: Unidades vs Checklist Específico vs Importar CSV (Admin) */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'unidades' | 'checklist' | 'importar')}
        className="w-full"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#D3DFE9] pb-3 gap-3">
          <TabsList className="bg-[#E8F1F8] p-1 rounded-lg border border-[#D3DFE9]/80 h-auto self-start">
            <TabsTrigger
              value="unidades"
              className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white text-[#486581] font-semibold text-xs sm:text-sm py-1.5 px-3.5 rounded-md gap-2"
            >
              <Building className="w-4 h-4" />
              Unidades Cadastradas ({unidades.length})
            </TabsTrigger>

            <TabsTrigger
              value="checklist"
              className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white text-[#486581] font-semibold text-xs sm:text-sm py-1.5 px-3.5 rounded-md gap-2"
            >
              <FileCheck2 className="w-4 h-4" />
              Checklist Específico ({checklistCategorias.length})
            </TabsTrigger>

            {isAdmin && (
              <TabsTrigger
                value="importar"
                className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white text-[#486581] font-semibold text-xs sm:text-sm py-1.5 px-3.5 rounded-md gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Importar CSV
              </TabsTrigger>
            )}
          </TabsList>

          <div className="text-xs text-[#627D98] font-medium flex items-center gap-3">
            <span>
              <strong>{unidades.length}</strong> unidade(s)
            </span>
            <span>•</span>
            <span>
              <strong>{checklistCategorias.length}</strong> item(ns) no checklist
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PARTE A: LISTA DAS UNIDADES CADASTRADAS DAQUELE TIPO          */}
        {/* ============================================================== */}
        <TabsContent value="unidades" className="space-y-6 mt-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-[#D3DFE9] shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#486581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                placeholder={`Buscar unidade em ${tipo.nome} por nome, CNES, município ou CNPJ...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs sm:text-sm border-[#D3DFE9] focus-visible:ring-[#004B8D] h-10 bg-[#F4F6F9]/50"
              />
            </div>

            <div className="w-full md:w-56">
              <Select value={selectedMunicipio} onValueChange={setSelectedMunicipio}>
                <SelectTrigger className="border-[#D3DFE9] text-xs h-10 bg-white">
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="w-3.5 h-3.5 text-[#004B8D] shrink-0" />
                    <span className="text-[#627D98] shrink-0 font-medium">Município:</span>
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos ({unidades.length})</SelectItem>
                  {municipios.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Units Grid */}
          {isLoading ? (
            <div className="py-20 text-center text-[#486581]">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#004B8D] mb-3" />
              <p className="text-sm font-semibold">Carregando unidades de {tipo.nome}...</p>
            </div>
          ) : filteredUnidades.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-[#D3DFE9] p-12 text-center space-y-4">
              <Building2 className="w-12 h-12 text-[#829AB1] mx-auto stroke-[1.5]" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#102A43]">
                  Nenhuma unidade de {tipo.nome} encontrada
                </h3>
                <p className="text-xs text-[#486581] max-w-md mx-auto leading-relaxed">
                  {searchQuery || selectedMunicipio !== 'todos'
                    ? 'Nenhum resultado corresponde aos filtros de busca aplicados.'
                    : `Ainda não há estabelecimentos do tipo "${tipo.nome}" cadastrados no CREA-PI.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                {searchQuery || selectedMunicipio !== 'todos' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedMunicipio('todos')
                    }}
                    className="border-[#D3DFE9] text-[#004B8D] text-xs cursor-pointer"
                  >
                    Limpar filtros
                  </Button>
                ) : (
                  isAdmin && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setHospitalToEdit(null)
                        setIsFormOpen(true)
                      }}
                      className="bg-[#004B8D] hover:bg-[#003666] text-white text-xs font-bold px-4 cursor-pointer gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Cadastrar Primeira Unidade
                    </Button>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUnidades.map((unit) => (
                <HospitalCard key={unit.id} hospital={unit} onClick={() => handleCardClick(unit)} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============================================================== */}
        {/* PARTE B: CHECKLIST DE VISTORIA ESPECÍFICO DESTE TIPO           */}
        {/* ============================================================== */}
        <TabsContent value="checklist" className="space-y-6 mt-6">
          <div className="bg-white rounded-2xl border border-[#D3DFE9] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D3DFE9] pb-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-[#004B8D]" />
                  <h2 className="text-lg font-bold text-[#102A43]">
                    Checklist Exclusivo: {tipo.nome}
                  </h2>
                </div>
                <p className="text-xs text-[#486581]">
                  Itens técnicos que serão inspecionados nas vistorias de empreendimentos do tipo{' '}
                  <strong>{tipo.nome}</strong>.
                </p>
              </div>

              {isAdmin && (
                <Button
                  size="sm"
                  onClick={handleOpenCreateCategoria}
                  className="bg-[#004B8D] hover:bg-[#003666] text-white font-semibold text-xs h-9 px-3.5 gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Item ao Checklist de {tipo.nome}
                </Button>
              )}
            </div>

            {checklistCategorias.length === 0 ? (
              <div className="bg-[#F4F6F9] rounded-xl border border-dashed border-[#D3DFE9] p-10 text-center space-y-3">
                <FileCheck2 className="w-10 h-10 text-[#829AB1] mx-auto stroke-[1.5]" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#102A43]">
                    Checklist de {tipo.nome} está vazio
                  </h4>
                  <p className="text-xs text-[#486581] max-w-md mx-auto leading-relaxed">
                    {isStandardHospital
                      ? 'Nenhum item cadastrado para este tipo.'
                      : `Este tipo de empreendimento começa sem itens padrão. Cadastre os itens e exigências regulatórias específicos para ${tipo.nome}.`}
                  </p>
                </div>

                {isAdmin && (
                  <Button
                    size="sm"
                    onClick={handleOpenCreateCategoria}
                    className="bg-[#004B8D] hover:bg-[#003666] text-white text-xs font-bold px-4 mt-2 cursor-pointer gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Cadastrar Primeiro Item de {tipo.nome}
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#D3DFE9]/80 border border-[#D3DFE9] rounded-xl overflow-hidden">
                {checklistCategorias.map((cat, idx) => (
                  <div
                    key={cat.id}
                    className="p-4 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-[#E8F1F8] text-[#004B8D] font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>

                      <div className="space-y-0.5">
                        <div className="font-bold text-sm text-[#102A43]">{cat.nome}</div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#486581]">
                          <span className="flex items-center gap-1">
                            Exige ART:{' '}
                            <strong className={cat.exigeArt ? 'text-[#004B8D]' : 'text-[#627D98]'}>
                              {cat.exigeArt ? 'Sim' : 'Não'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            Periodicidade:{' '}
                            {cat.periodicidadeDias && cat.periodicidadeDias > 0 ? (
                              <strong className="text-[#102A43]">
                                {cat.periodicidadeDias} dias
                              </strong>
                            ) : (
                              <span className="text-[#829AB1] italic">Sem periodicidade fixa</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditCategoria(cat)}
                          className="h-8 px-2.5 text-xs border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8] font-semibold gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCategoriaToDelete(cat)}
                          className="h-8 w-8 p-0 text-[#829AB1] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Excluir item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* PARTE C: IMPORTAR CSV (RESTRITO ADMIN)                         */}
        {/* ============================================================== */}
        {isAdmin && (
          <TabsContent value="importar" className="mt-6">
            <HospitalImportCsv
              existingHospitais={unidades}
              onImportCompleted={(created, updated) => {
                loadData()
                setActiveTab('unidades')
              }}
              onCancel={() => setActiveTab('unidades')}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* SHEET: DETALHES DA UNIDADE */}
      <HospitalDetailSheet
        hospital={selectedHospital}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdate={handleUpdateUnidade}
        onDelete={isAdmin ? handleDeleteUnidade : undefined}
      />

      {/* MODAL: FORMULÁRIO DE NOVA UNIDADE */}
      <HospitalFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        hospitalToEdit={hospitalToEdit}
        onSave={handleCreateUnidade}
      />

      {/* MODAL: CRIAR / EDITAR ITEM DE CHECKLIST */}
      <Dialog open={isCategoriaModalOpen} onOpenChange={setIsCategoriaModalOpen}>
        <DialogContent className="max-w-md bg-white border-[#D3DFE9]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#102A43]">
              {editingCategoria
                ? 'Editar Item de Checklist'
                : `Novo Item de Checklist (${tipo.nome})`}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#486581]">
              Configure o item técnico de vistoria exclusivo para {tipo.nome}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCategoria} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="item-nome" className="text-xs font-bold text-[#102A43]">
                Descrição da Instalação / Item <span className="text-rose-600">*</span>
              </Label>
              <Input
                id="item-nome"
                placeholder="Ex: Pivô de irrigação, Silo de grãos, Subestação..."
                value={categoriaForm.nome}
                onChange={(e) => setCategoriaForm({ ...categoriaForm, nome: e.target.value })}
                className="border-[#D3DFE9] focus-visible:ring-[#004B8D] text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#102A43]">
                Exige ART (Anotação de Responsabilidade Técnica)?
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCategoriaForm({ ...categoriaForm, exigeArt: true })}
                  className={`text-xs font-semibold cursor-pointer ${
                    categoriaForm.exigeArt
                      ? 'bg-[#004B8D] text-white border-[#004B8D]'
                      : 'border-[#D3DFE9] text-[#486581]'
                  }`}
                >
                  Sim (Requer ART)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCategoriaForm({ ...categoriaForm, exigeArt: false })}
                  className={`text-xs font-semibold cursor-pointer ${
                    !categoriaForm.exigeArt
                      ? 'bg-[#004B8D] text-white border-[#004B8D]'
                      : 'border-[#D3DFE9] text-[#486581]'
                  }`}
                >
                  Não (Dispensado)
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="item-per" className="text-xs font-bold text-[#102A43]">
                  Periodicidade Regulatória em Dias
                </Label>
                <span className="text-[11px] text-[#627D98]">Vazio = sem periodicidade fixa</span>
              </div>
              <Input
                id="item-per"
                type="number"
                min={0}
                placeholder="Ex: 365 (1 ano) ou vazio"
                value={categoriaForm.periodicidadeDias ?? ''}
                onChange={(e) => {
                  const v = e.target.value ? parseInt(e.target.value, 10) : null
                  setCategoriaForm({ ...categoriaForm, periodicidadeDias: v })
                }}
                className="border-[#D3DFE9] focus-visible:ring-[#004B8D] text-sm"
              />
              <p className="text-[11px] text-[#627D98]">
                Vistorias com data anterior a esse período serão calculadas como{' '}
                <strong>Vencidas</strong>.
              </p>
            </div>

            <DialogFooter className="pt-3 border-t border-[#D3DFE9]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCategoriaModalOpen(false)}
                className="border-[#D3DFE9] text-[#486581] cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingCategoria}
                className="bg-[#004B8D] hover:bg-[#003666] text-white font-bold cursor-pointer"
              >
                {isSavingCategoria
                  ? 'Salvando...'
                  : editingCategoria
                    ? 'Salvar Alterações'
                    : 'Adicionar ao Checklist'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE CATEGORIA */}
      <AlertDialog
        open={!!categoriaToDelete}
        onOpenChange={(open) => !open && setCategoriaToDelete(null)}
      >
        <AlertDialogContent className="border-[#D3DFE9] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#102A43]">
              Excluir Item de Checklist
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#486581]">
              Tem certeza que deseja excluir &ldquo;{categoriaToDelete?.nome}&rdquo; do checklist de{' '}
              {tipo.nome}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#D3DFE9] text-[#486581] cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategoria}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
            >
              Excluir Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
