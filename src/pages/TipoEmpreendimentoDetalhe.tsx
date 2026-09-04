import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  Building,
  Layers,
  ChevronDown,
  ChevronRight,
  ListPlus,
  Info,
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
  SubitemChecklist,
  SubitemChecklistFormData,
} from '@/services/categoriasVistoria'
import { tiposEmpreendimentoService, TipoEmpreendimento } from '@/services/tiposEmpreendimento'
import { getIconComponent } from '@/pages/TiposEmpreendimento'
import { HospitalCard } from '@/components/HospitalCard'
import { HospitalDetailSheet } from '@/components/HospitalDetailSheet'
import { HospitalFormDialog } from '@/components/HospitalFormDialog'
import { HospitalImportCsv } from '@/components/HospitalImportCsv'
import { ChecklistImportCsv } from '@/components/ChecklistImportCsv'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export default function TipoEmpreendimentoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  // State
  const [tipo, setTipo] = useState<TipoEmpreendimento | null>(null)
  const [unidades, setUnidades] = useState<Hospital[]>([])
  const [checklistCategorias, setChecklistCategorias] = useState<CategoriaVistoria[]>([])
  const [checklistSubitens, setChecklistSubitens] = useState<SubitemChecklist[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Active main tab in this type's detail page: 'unidades' | 'checklist' | 'importar_unidades' | 'importar_checklist'
  const [activeTab, setActiveTab] = useState<string>('unidades')

  // Search & Filter in Unidades
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>('todos')

  // Modals for Unidade / Hospital
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [hospitalToEdit, setHospitalToEdit] = useState<Hospital | null>(null)

  // Modals for Item Principal (Nível 1 - Agrupador)
  const [isItemPrincipalModalOpen, setIsItemPrincipalModalOpen] = useState(false)
  const [editingItemPrincipal, setEditingItemPrincipal] = useState<CategoriaVistoria | null>(null)
  const [itemPrincipalNome, setItemPrincipalNome] = useState('')
  const [itemPrincipalToDelete, setItemPrincipalToDelete] = useState<CategoriaVistoria | null>(null)
  const [isSavingItemPrincipal, setIsSavingItemPrincipal] = useState(false)

  // Modals for Subitem (Nível 2 - Atividade)
  const [isSubitemModalOpen, setIsSubitemModalOpen] = useState(false)
  const [selectedCategoriaForSubitem, setSelectedCategoriaForSubitem] =
    useState<CategoriaVistoria | null>(null)
  const [editingSubitem, setEditingSubitem] = useState<SubitemChecklist | null>(null)
  const [subitemForm, setSubitemForm] = useState<{
    codigo: string
    descricao: string
    exigeArt: boolean
    periodicidadeDias: number | null
  }>({
    codigo: '',
    descricao: '',
    exigeArt: true,
    periodicidadeDias: null,
  })
  const [subitemToDelete, setSubitemToDelete] = useState<SubitemChecklist | null>(null)
  const [isSavingSubitem, setIsSavingSubitem] = useState(false)

  // Collapsible section state for Item Principal
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }))
  }

  // Load Data
  const loadData = useCallback(async () => {
    if (!id) return
    try {
      setIsLoading(true)
      const tiposList = await tiposEmpreendimentoService.getAll()

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

      // Fetch units, categories and subitens specific to this tipo
      const [allUnidades, allCategorias, allSubitens] = await Promise.all([
        hospitaisService.getAll(),
        categoriasVistoriaService.getAll(),
        categoriasVistoriaService.getAllSubitens(),
      ])

      const isHospitalType = matched.nome.trim().toLowerCase() === 'hospital'
      const filteredUnits = allUnidades.filter((u) => {
        const uTipo = u.tipo?.trim() || 'Hospital'
        return uTipo.toLowerCase() === matched.nome.trim().toLowerCase()
      })

      // Ordenar categorias pelo campo ordem sequencial (1, 2, 3...)
      const filteredCats = allCategorias
        .filter((c) => {
          const cTipo = c.tipo?.trim() || (isHospitalType ? 'Hospital' : '')
          return cTipo.toLowerCase() === matched.nome.trim().toLowerCase()
        })
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))

      const catIdsSet = new Set(filteredCats.map((c) => c.id))
      const filteredSubs = allSubitens
        .filter((s) => {
          if (s.categoria && catIdsSet.has(s.categoria)) return true
          const sTipo = s.tipo?.trim() || (isHospitalType ? 'Hospital' : '')
          return sTipo.toLowerCase() === matched.nome.trim().toLowerCase()
        })
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))

      setUnidades(filteredUnits)
      setChecklistCategorias(filteredCats)
      setChecklistSubitens(filteredSubs)
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

  // =========================================================================
  // HANDLERS: ITEM PRINCIPAL (AGRUPADOR - NÍVEL 1)
  // =========================================================================
  const handleOpenCreateItemPrincipal = () => {
    if (!tipo) return
    setEditingItemPrincipal(null)
    setItemPrincipalNome('')
    setIsItemPrincipalModalOpen(true)
  }

  const handleOpenEditItemPrincipal = (cat: CategoriaVistoria) => {
    setEditingItemPrincipal(cat)
    setItemPrincipalNome(cat.nome)
    setIsItemPrincipalModalOpen(true)
  }

  const handleSaveItemPrincipal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tipo || !itemPrincipalNome.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Informe o título do item principal (tema agrupador).',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSavingItemPrincipal(true)
      if (editingItemPrincipal) {
        const updated = await categoriasVistoriaService.update(editingItemPrincipal.id, {
          nome: itemPrincipalNome.trim(),
          tipo: tipo.nome,
        })
        setChecklistCategorias((prev) =>
          prev.map((item) => (item.id === editingItemPrincipal.id ? updated : item)),
        )
        toast({
          title: 'Item Principal atualizado!',
          description: `"${updated.nome}" foi atualizado com sucesso.`,
        })
      } else {
        const nextOrdem = checklistCategorias.reduce((max, c) => Math.max(max, c.ordem || 0), 0) + 1
        const created = await categoriasVistoriaService.create({
          nome: itemPrincipalNome.trim(),
          tipo: tipo.nome,
          ordem: nextOrdem,
        })
        setChecklistCategorias((prev) => [...prev, created])
        toast({
          title: 'Item Principal criado!',
          description: `Item ${nextOrdem}: "${created.nome}" adicionado como agrupador.`,
        })
      }
      setIsItemPrincipalModalOpen(false)
    } catch (err) {
      console.error('Erro ao salvar item principal:', err)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o item principal.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingItemPrincipal(false)
    }
  }

  const handleDeleteItemPrincipal = async () => {
    if (!itemPrincipalToDelete) return
    try {
      setIsSavingItemPrincipal(true)
      await categoriasVistoriaService.delete(itemPrincipalToDelete.id)
      setChecklistCategorias((prev) => prev.filter((item) => item.id !== itemPrincipalToDelete.id))
      // Remove subitens vinculados do estado local
      setChecklistSubitens((prev) =>
        prev.filter((sub) => sub.categoria !== itemPrincipalToDelete.id),
      )
      toast({
        title: 'Item Principal excluído',
        description: `O agrupador "${itemPrincipalToDelete.nome}" e seus subitens foram removidos.`,
      })
      setItemPrincipalToDelete(null)
    } catch (err) {
      console.error('Erro ao excluir item principal:', err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o item principal.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingItemPrincipal(false)
    }
  }

  // =========================================================================
  // HANDLERS: SUBITEM (ATIVIDADE - NÍVEL 2)
  // =========================================================================
  const handleOpenCreateSubitem = (cat: CategoriaVistoria) => {
    if (!tipo) return
    setSelectedCategoriaForSubitem(cat)
    setEditingSubitem(null)

    // Calcular próximo código sequencial: Ex: 1.1, 1.2, etc.
    const subsOfCat = checklistSubitens.filter((s) => s.categoria === cat.id)
    const nextSubNum = subsOfCat.length + 1
    const catNum = cat.ordem || checklistCategorias.findIndex((c) => c.id === cat.id) + 1
    const defaultCodigo = `${catNum}.${nextSubNum}`

    setSubitemForm({
      codigo: defaultCodigo,
      descricao: '',
      exigeArt: true,
      periodicidadeDias: null,
    })
    setIsSubitemModalOpen(true)
  }

  const handleOpenEditSubitem = (sub: SubitemChecklist, cat: CategoriaVistoria) => {
    setSelectedCategoriaForSubitem(cat)
    setEditingSubitem(sub)
    setSubitemForm({
      codigo: sub.codigo || '',
      descricao: sub.descricao,
      exigeArt: sub.exigeArt,
      periodicidadeDias: sub.periodicidadeDias || null,
    })
    setIsSubitemModalOpen(true)
  }

  const handleSaveSubitem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tipo || !selectedCategoriaForSubitem || !subitemForm.descricao.trim()) {
      toast({
        title: 'Descrição obrigatória',
        description: 'Informe a descrição da atividade do subitem.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSavingSubitem(true)
      if (editingSubitem) {
        const updated = await categoriasVistoriaService.updateSubitem(editingSubitem.id, {
          categoria: selectedCategoriaForSubitem.id,
          tipo: tipo.nome,
          codigo: subitemForm.codigo.trim(),
          descricao: subitemForm.descricao.trim(),
          exigeArt: subitemForm.exigeArt,
          periodicidadeDias: subitemForm.periodicidadeDias,
        })
        setChecklistSubitens((prev) =>
          prev.map((sub) => (sub.id === editingSubitem.id ? updated : sub)),
        )
        toast({
          title: 'Subitem atualizado!',
          description: `Subitem ${updated.codigo || ''} atualizado com sucesso.`,
        })
      } else {
        const subsOfCat = checklistSubitens.filter(
          (s) => s.categoria === selectedCategoriaForSubitem.id,
        )
        const nextOrder = subsOfCat.reduce((max, s) => Math.max(max, s.ordem || 0), 0) + 1
        const catNum =
          selectedCategoriaForSubitem.ordem ||
          checklistCategorias.findIndex((c) => c.id === selectedCategoriaForSubitem.id) + 1
        const codigo = subitemForm.codigo.trim() || `${catNum}.${nextOrder}`

        const created = await categoriasVistoriaService.createSubitem({
          categoria: selectedCategoriaForSubitem.id,
          tipo: tipo.nome,
          ordem: nextOrder,
          codigo,
          descricao: subitemForm.descricao.trim(),
          exigeArt: subitemForm.exigeArt,
          periodicidadeDias: subitemForm.periodicidadeDias,
        })
        setChecklistSubitens((prev) => [...prev, created])
        toast({
          title: 'Subitem adicionado!',
          description: `Subitem ${created.codigo} adicionado ao tema "${selectedCategoriaForSubitem.nome}".`,
        })
      }
      setIsSubitemModalOpen(false)
    } catch (err) {
      console.error('Erro ao salvar subitem:', err)
      toast({
        title: 'Erro ao salvar subitem',
        description: 'Não foi possível gravar o subitem no checklist.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingSubitem(false)
    }
  }

  const handleDeleteSubitem = async () => {
    if (!subitemToDelete) return
    try {
      setIsSavingSubitem(true)
      await categoriasVistoriaService.deleteSubitem(subitemToDelete.id)
      setChecklistSubitens((prev) => prev.filter((s) => s.id !== subitemToDelete.id))
      toast({
        title: 'Subitem excluído',
        description: `O subitem "${subitemToDelete.descricao}" foi removido do checklist.`,
      })
      setSubitemToDelete(null)
    } catch (err) {
      console.error('Erro ao excluir subitem:', err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o subitem.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingSubitem(false)
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
  const totalSubitensCount = checklistSubitens.length

  return (
    <div className="animate-page-enter space-y-6 pb-16 w-full max-w-full overflow-x-hidden">
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
              <Badge className="bg-[#E8F1F8] text-[#004B8D] border-0 text-xs font-bold">
                CREA-PI
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#486581] max-w-2xl leading-relaxed">
              {tipo.descricao ||
                'Empreendimento com vistoria técnica e checklist regulatório em dois níveis do CREA-PI.'}
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

      {/* Main Tabs: Unidades vs Checklist Específico (2 Níveis) vs Importar */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val)} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#D3DFE9] pb-3 gap-3">
          <TabsList className="bg-[#E8F1F8] p-1 rounded-lg border border-[#D3DFE9]/80 h-auto self-start flex-wrap">
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
              <Layers className="w-4 h-4" />
              Checklist Específico (2 Níveis) ({checklistCategorias.length} temas /{' '}
              {totalSubitensCount} subitens)
            </TabsTrigger>

            {isAdmin && (
              <TabsTrigger
                value="importar_checklist"
                className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white text-[#486581] font-semibold text-xs sm:text-sm py-1.5 px-3.5 rounded-md gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#004B8D] data-[state=active]:text-white" />
                Importar Checklist CSV
              </TabsTrigger>
            )}

            {isAdmin && (
              <TabsTrigger
                value="importar_unidades"
                className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white text-[#486581] font-semibold text-xs sm:text-sm py-1.5 px-3.5 rounded-md gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Importar Unidades CSV
              </TabsTrigger>
            )}
          </TabsList>

          <div className="text-xs text-[#627D98] font-medium flex items-center gap-3">
            <span>
              <strong>{unidades.length}</strong> unidade(s)
            </span>
            <span>•</span>
            <span>
              <strong>{checklistCategorias.length}</strong> temas /{' '}
              <strong>{totalSubitensCount}</strong> subitens
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
        {/* PARTE B: CHECKLIST EM DOIS NÍVEIS (ITEM PRINCIPAL + SUBITENS) */}
        {/* ============================================================== */}
        <TabsContent value="checklist" className="space-y-6 mt-6">
          <div className="bg-white rounded-2xl border border-[#D3DFE9] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D3DFE9] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#004B8D]" />
                  <h2 className="text-lg font-bold text-[#102A43]">
                    Checklist Específico em Dois Níveis: {tipo.nome}
                  </h2>
                </div>
                <p className="text-xs text-[#486581] max-w-2xl leading-relaxed">
                  <strong>Nível 1 (Item Principal):</strong> Grande tema técnico (1, 2, 3...)
                  atuando como título/agrupador. <strong>Nível 2 (Subitens):</strong> Atividades a
                  fiscalizar (1.1, 1.2...) com exigência de ART e periodicidade.
                </p>
              </div>

              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('importar_checklist')}
                    className="border-[#004B8D]/30 text-[#004B8D] hover:bg-[#E8F1F8] font-semibold text-xs h-9 px-3 gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Importar CSV Completo
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleOpenCreateItemPrincipal}
                    className="bg-[#004B8D] hover:bg-[#003666] text-white font-semibold text-xs h-9 px-3.5 gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Novo Item Principal (Tema)
                  </Button>
                </div>
              )}
            </div>

            {/* Checklist Tree */}
            {checklistCategorias.length === 0 ? (
              <div className="bg-[#F4F6F9] rounded-xl border border-dashed border-[#D3DFE9] p-10 text-center space-y-3">
                <Layers className="w-10 h-10 text-[#829AB1] mx-auto stroke-[1.5]" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#102A43]">
                    Checklist de {tipo.nome} está vazio
                  </h4>
                  <p className="text-xs text-[#486581] max-w-md mx-auto leading-relaxed">
                    Cadastre os temas principais (agrupadores) e adicione as atividades regulatórias
                    (subitens) para este tipo de empreendimento.
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={handleOpenCreateItemPrincipal}
                      className="bg-[#004B8D] hover:bg-[#003666] text-white text-xs font-bold px-4 cursor-pointer gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Criar Primeiro Item Principal (Tema 1)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveTab('importar_checklist')}
                      className="border-[#004B8D]/40 text-[#004B8D] hover:bg-[#E8F1F8] text-xs font-semibold px-4 cursor-pointer gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Importar Planilha CSV
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {checklistCategorias.map((cat, idx) => {
                  const itemNumber = cat.ordem || idx + 1
                  const subsOfCat = checklistSubitens
                    .filter((s) => s.categoria === cat.id)
                    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
                  const isCollapsed = collapsedCategories[cat.id]

                  return (
                    <div
                      key={cat.id}
                      className="border border-[#D3DFE9] rounded-xl overflow-hidden bg-white shadow-xs transition-all hover:border-[#004B8D]/40"
                    >
                      {/* Section Header: Item Principal (Agrupador) */}
                      <div className="bg-[#E8F1F8]/70 border-b border-[#D3DFE9] p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div
                          onClick={() => toggleCategoryCollapse(cat.id)}
                          className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0"
                        >
                          <span className="w-7 h-7 rounded-lg bg-[#004B8D] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {itemNumber}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm sm:text-base text-[#102A43] truncate flex items-center gap-2">
                              {cat.nome}
                              <Badge className="bg-white text-[#004B8D] border border-[#004B8D]/20 text-[10px] font-bold px-2 py-0.5 ml-1">
                                {subsOfCat.length} {subsOfCat.length === 1 ? 'subitem' : 'subitens'}
                              </Badge>
                            </h3>
                          </div>
                          <span className="text-[#627D98] ml-auto sm:ml-2">
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-[#486581]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#486581]" />
                            )}
                          </span>
                        </div>

                        {/* Actions for Item Principal */}
                        {isAdmin && (
                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-1 sm:pt-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenCreateSubitem(cat)}
                              className="h-8 px-2.5 text-xs bg-white border-[#004B8D]/30 text-[#004B8D] hover:bg-[#004B8D] hover:text-white font-semibold gap-1.5 cursor-pointer shadow-xs transition-colors"
                            >
                              <ListPlus className="w-3.5 h-3.5" />
                              Adicionar Subitem
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEditItemPrincipal(cat)}
                              className="h-8 w-8 p-0 text-[#486581] hover:text-[#004B8D] hover:bg-white cursor-pointer"
                              title="Editar título do tema principal"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setItemPrincipalToDelete(cat)}
                              className="h-8 w-8 p-0 text-[#829AB1] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Excluir tema principal e seus subitens"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Subitens List (Nível 2) */}
                      {!isCollapsed && (
                        <div>
                          {subsOfCat.length === 0 ? (
                            <div className="p-4 sm:p-5 text-center text-xs text-[#627D98] bg-[#F4F6F9]/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                              <span className="italic flex items-center gap-1.5">
                                <Info className="w-4 h-4 text-[#829AB1]" />
                                Nenhum subitem cadastrado neste tema.
                              </span>
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenCreateSubitem(cat)}
                                  className="h-7 px-3 text-xs border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8] font-semibold gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  Cadastrar Subitem {itemNumber}.1
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="divide-y divide-[#D3DFE9]/70">
                              {subsOfCat.map((sub, sIdx) => {
                                const subCode = sub.codigo || `${itemNumber}.${sIdx + 1}`
                                return (
                                  <div
                                    key={sub.id}
                                    className="p-3.5 sm:px-5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                                  >
                                    <div className="flex items-start gap-3 min-w-0">
                                      <span className="font-mono text-xs font-bold text-[#004B8D] bg-[#E8F1F8] px-2 py-0.5 rounded-md shrink-0 border border-[#004B8D]/20">
                                        {subCode}
                                      </span>

                                      <div className="space-y-1 min-w-0">
                                        <p className="text-xs sm:text-sm text-[#102A43] font-medium leading-relaxed">
                                          {sub.descricao}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#486581]">
                                          <span className="flex items-center gap-1">
                                            Exige ART:{' '}
                                            <strong
                                              className={
                                                sub.exigeArt ? 'text-[#004B8D]' : 'text-[#627D98]'
                                              }
                                            >
                                              {sub.exigeArt ? 'Sim' : 'Não'}
                                            </strong>
                                          </span>
                                          <span>•</span>
                                          <span className="flex items-center gap-1">
                                            Periodicidade:{' '}
                                            {sub.periodicidadeDias && sub.periodicidadeDias > 0 ? (
                                              <strong className="text-[#102A43]">
                                                {sub.periodicidadeDias} dias
                                              </strong>
                                            ) : (
                                              <span className="text-[#829AB1] italic">
                                                Sem periodicidade fixa
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {isAdmin && (
                                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleOpenEditSubitem(sub, cat)}
                                          className="h-7 px-2 text-xs text-[#004B8D] hover:bg-[#E8F1F8] font-semibold gap-1 cursor-pointer"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                          Editar
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setSubitemToDelete(sub)}
                                          className="h-7 w-7 p-0 text-[#829AB1] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                          title="Excluir subitem"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* PARTE C: IMPORTAR CHECKLIST CSV (RESTRITO ADMIN)               */}
        {/* ============================================================== */}
        {isAdmin && (
          <TabsContent value="importar_checklist" className="mt-6">
            <ChecklistImportCsv
              tipoNome={tipo.nome}
              existingCategorias={checklistCategorias}
              existingSubitens={checklistSubitens}
              onImportCompleted={() => {
                loadData()
                setActiveTab('checklist')
              }}
              onCancel={() => setActiveTab('checklist')}
            />
          </TabsContent>
        )}

        {/* ============================================================== */}
        {/* PARTE D: IMPORTAR UNIDADES CSV (RESTRITO ADMIN)                */}
        {/* ============================================================== */}
        {isAdmin && (
          <TabsContent value="importar_unidades" className="mt-6">
            <HospitalImportCsv
              existingHospitais={unidades}
              onImportCompleted={() => {
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

      {/* ================================================================= */}
      {/* MODAL: CRIAR / EDITAR ITEM PRINCIPAL (AGRUPADOR - NÍVEL 1)        */}
      {/* ================================================================= */}
      <Dialog open={isItemPrincipalModalOpen} onOpenChange={setIsItemPrincipalModalOpen}>
        <DialogContent className="max-w-md bg-white border-[#D3DFE9]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#102A43] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#004B8D]" />
              {editingItemPrincipal
                ? 'Editar Item Principal (Tema)'
                : `Novo Item Principal em ${tipo.nome}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#486581]">
              O Item Principal serve como agrupador e título na tela (ex: Ar-condicionado, SPDA,
              Instalações Elétricas).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveItemPrincipal} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="principal-nome" className="text-xs font-bold text-[#102A43]">
                Título do Item Principal (Tema) <span className="text-rose-600">*</span>
              </Label>
              <Input
                id="principal-nome"
                placeholder="Ex: Ar-condicionado e Ventilação, Instalações Elétricas..."
                value={itemPrincipalNome}
                onChange={(e) => setItemPrincipalNome(e.target.value)}
                className="border-[#D3DFE9] focus-visible:ring-[#004B8D] text-sm"
                required
              />
              <p className="text-[11px] text-[#627D98]">
                Recebe numeração sequencial automática (1, 2, 3...) e não possui campos próprios de
                marcação de fiscalização.
              </p>
            </div>

            <DialogFooter className="pt-3 border-t border-[#D3DFE9]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsItemPrincipalModalOpen(false)}
                className="border-[#D3DFE9] text-[#486581] cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingItemPrincipal}
                className="bg-[#004B8D] hover:bg-[#003666] text-white font-bold cursor-pointer"
              >
                {isSavingItemPrincipal
                  ? 'Salvando...'
                  : editingItemPrincipal
                    ? 'Salvar Alterações'
                    : 'Criar Item Principal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* MODAL: CRIAR / EDITAR SUBITEM (ATIVIDADE - NÍVEL 2)                */}
      {/* ================================================================= */}
      <Dialog open={isSubitemModalOpen} onOpenChange={setIsSubitemModalOpen}>
        <DialogContent className="max-w-md bg-white border-[#D3DFE9]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#102A43]">
              {editingSubitem ? 'Editar Subitem' : 'Novo Subitem'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#486581]">
              Tema: <strong className="text-[#004B8D]">{selectedCategoriaForSubitem?.nome}</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSubitem} className="space-y-4 pt-2">
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-1 space-y-1.5">
                <Label htmlFor="subitem-codigo" className="text-xs font-bold text-[#102A43]">
                  Código
                </Label>
                <Input
                  id="subitem-codigo"
                  placeholder="Ex: 1.1"
                  value={subitemForm.codigo}
                  onChange={(e) => setSubitemForm({ ...subitemForm, codigo: e.target.value })}
                  className="border-[#D3DFE9] focus-visible:ring-[#004B8D] text-xs font-mono font-bold"
                />
              </div>

              <div className="col-span-3 space-y-1.5">
                <Label htmlFor="subitem-desc" className="text-xs font-bold text-[#102A43]">
                  Descrição da Atividade a Fiscalizar <span className="text-rose-600">*</span>
                </Label>
                <Input
                  id="subitem-desc"
                  placeholder="Ex: Manutenção do PMOC, Laudo de aterramento..."
                  value={subitemForm.descricao}
                  onChange={(e) => setSubitemForm({ ...subitemForm, descricao: e.target.value })}
                  className="border-[#D3DFE9] focus-visible:ring-[#004B8D] text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#102A43]">
                Exige ART (Anotação de Responsabilidade Técnica)?
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSubitemForm({ ...subitemForm, exigeArt: true })}
                  className={`text-xs font-semibold cursor-pointer ${
                    subitemForm.exigeArt
                      ? 'bg-[#004B8D] text-white border-[#004B8D]'
                      : 'border-[#D3DFE9] text-[#486581]'
                  }`}
                >
                  Sim (Requer ART)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSubitemForm({ ...subitemForm, exigeArt: false })}
                  className={`text-xs font-semibold cursor-pointer ${
                    !subitemForm.exigeArt
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
                <Label htmlFor="subitem-per" className="text-xs font-bold text-[#102A43]">
                  Periodicidade Regulatória em Dias
                </Label>
                <span className="text-[11px] text-[#627D98]">Vazio = sem periodicidade fixa</span>
              </div>
              <Input
                id="subitem-per"
                type="number"
                min={0}
                placeholder="Ex: 365 (1 ano) ou vazio"
                value={subitemForm.periodicidadeDias ?? ''}
                onChange={(e) => {
                  const v = e.target.value ? parseInt(e.target.value, 10) : null
                  setSubitemForm({ ...subitemForm, periodicidadeDias: v })
                }}
                className="border-[#D3DFE9] focus-visible:ring-[#004B8D] text-sm"
              />
              <p className="text-[11px] text-[#627D98]">
                Vistorias com data da última verificação anterior a esse período serão calculadas
                como <strong>Vencidas</strong>.
              </p>
            </div>

            <DialogFooter className="pt-3 border-t border-[#D3DFE9]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubitemModalOpen(false)}
                className="border-[#D3DFE9] text-[#486581] cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingSubitem}
                className="bg-[#004B8D] hover:bg-[#003666] text-white font-bold cursor-pointer"
              >
                {isSavingSubitem
                  ? 'Salvando...'
                  : editingSubitem
                    ? 'Salvar Alterações'
                    : 'Adicionar Subitem'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE ITEM PRINCIPAL */}
      <AlertDialog
        open={!!itemPrincipalToDelete}
        onOpenChange={(open) => !open && setItemPrincipalToDelete(null)}
      >
        <AlertDialogContent className="border-[#D3DFE9] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#102A43]">
              Excluir Item Principal e seus Subitens
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#486581]">
              Tem certeza que deseja excluir &ldquo;{itemPrincipalToDelete?.nome}&rdquo;? Todos os
              subitens cadastrados dentro deste tema também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#D3DFE9] text-[#486581] cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItemPrincipal}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
            >
              Excluir Tema Completo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRM DELETE SUBITEM */}
      <AlertDialog
        open={!!subitemToDelete}
        onOpenChange={(open) => !open && setSubitemToDelete(null)}
      >
        <AlertDialogContent className="border-[#D3DFE9] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#102A43]">
              Excluir Subitem do Checklist
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#486581]">
              Tem certeza que deseja remover o subitem &ldquo;{subitemToDelete?.codigo}{' '}
              {subitemToDelete?.descricao}&rdquo;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#D3DFE9] text-[#486581] cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubitem}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
            >
              Excluir Subitem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
