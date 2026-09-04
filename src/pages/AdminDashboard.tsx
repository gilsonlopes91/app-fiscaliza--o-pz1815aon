import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  ClipboardCheck,
  ChevronRight,
  ExternalLink,
  Calendar,
  Layers,
  Trash2,
  FileCheck2,
  Check,
  TrendingUp,
  ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usersService, UserProfile } from '@/services/auth'
import { hospitaisService, Hospital } from '@/services/hospitais'
import { tiposEmpreendimentoService, TipoEmpreendimento } from '@/services/tiposEmpreendimento'
import {
  categoriasVistoriaService,
  CategoriaVistoria,
  SubitemChecklist,
} from '@/services/categoriasVistoria'
import {
  vistoriasService,
  Vistoria,
  VistoriaItem,
  calcularVencimentoSubitem,
} from '@/services/vistorias'
import {
  atribuicoesService,
  Atribuicao,
  AtribuicaoDetail,
  FiscalProgressSummary,
} from '@/services/atribuicoes'
import { AtribuirFiscalizacaoModal } from '@/components/AtribuirFiscalizacaoModal'
import { IniciarVistoriaModal } from '@/components/IniciarVistoriaModal'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [fiscais, setFiscais] = useState<UserProfile[]>([])
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [tipos, setTipos] = useState<TipoEmpreendimento[]>([])
  const [allCategorias, setAllCategorias] = useState<CategoriaVistoria[]>([])
  const [allSubitens, setAllSubitens] = useState<SubitemChecklist[]>([])
  const [allVistorias, setAllVistorias] = useState<Vistoria[]>([])
  const [allVistoriaItens, setAllVistoriaItens] = useState<VistoriaItem[]>([])
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([])
  const [details, setDetails] = useState<AtribuicaoDetail[]>([])

  // Modal de Itens com Vencimento
  const [isVencimentoModalOpen, setIsVencimentoModalOpen] = useState(false)
  const [vencimentoTab, setVencimentoTab] = useState<'todos' | 'vencidos' | 'vencendo'>('todos')

  // Filters & State
  const [selectedFiscalFiltro, setSelectedFiscalFiltro] = useState<string>('todos')
  const [selectedStatusFiltro, setSelectedStatusFiltro] = useState<string>('todos') // todos | concluidas | pendentes
  const [selectedTipoFiltro, setSelectedTipoFiltro] = useState<string>('todos')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalPreFiscalId, setModalPreFiscalId] = useState<string | undefined>()
  const [modalPreHospitalId, setModalPreHospitalId] = useState<string | undefined>()
  const [atribuicaoToDelete, setAtribuicaoToDelete] = useState<AtribuicaoDetail | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedHospitalForModal, setSelectedHospitalForModal] = useState<Hospital | null>(null)
  const [isIniciarModalOpen, setIsIniciarModalOpen] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [
        usersList,
        hospList,
        tiposList,
        catList,
        subList,
        atribList,
        vistoriasList,
        itensList,
      ] = await Promise.all([
        usersService.getAll(),
        hospitaisService.getAll(),
        tiposEmpreendimentoService.getAll(),
        categoriasVistoriaService.getAll(),
        categoriasVistoriaService.getAllSubitens(),
        atribuicoesService.getAll(),
        vistoriasService.getAll(),
        vistoriasService.getAllItens(),
      ])

      const approvedUsers = usersList.filter((u) => u.approved || u.approvalStatus === 'aprovado')
      setFiscais(approvedUsers)
      setHospitais(hospList)
      setTipos(tiposList)
      setAllCategorias(catList)
      setAllSubitens(subList)
      setAllVistorias(vistoriasList)
      setAllVistoriaItens(itensList)
      setAtribuicoes(atribList)

      // Compute details
      const computedDetails = await atribuicoesService.computeAtribuicoesProgress(
        atribList,
        catList,
      )
      setDetails(computedDetails)
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard admin:', err)
      toast({
        title: 'Erro ao carregar dashboard',
        description: 'Não foi possível buscar as informações de atribuição.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    document.title = 'Painel do Administrador · CREA-PI Fiscalização'
    loadData()
  }, [loadData])

  // Estrutura detalhada de itens com alerta de vencimento em todos os empreendimentos
  interface ItemAlertaVencimento {
    itemId: string
    vistoriaId: string
    hospitalId: string
    hospitalNome: string
    hospitalTipo: string
    hospitalMunicipio: string
    hospitalCnes: string
    subitemDescricao: string
    subitemCodigo: string
    categoriaNome: string
    dataUltimoServicoStr: string
    periodicidadeDias: number
    periodicidadeMeses?: number | null
    dataUltimaArtStr?: string | null
    status: 'vencido' | 'vencendo_em_breve'
    diasAteVencimento: number | null
    diasVencido: number | null
    dataVencimentoStr: string | null
    prestadorServico?: string
    numeroArt?: string
  }

  // Agrupa e calcula vencimento para todos os subitens preenchidos
  const { itensComAlerta, vencimentoStats } = useMemo(() => {
    // Mapa de subitens por ID para consulta rápida
    const subitensMap = new Map<string, SubitemChecklist>()
    allSubitens.forEach((s) => subitensMap.set(s.id, s))

    // Mapa de hospitais por ID
    const hospitaisMap = new Map<string, Hospital>()
    hospitais.forEach((h) => hospitaisMap.set(h.id, h))

    // Mapa de vistorias por ID
    const vistoriasMap = new Map<string, Vistoria>()
    allVistorias.forEach((v) => vistoriasMap.set(v.id, v))

    // Mapa de categorias por ID
    const categoriasMap = new Map<string, CategoriaVistoria>()
    allCategorias.forEach((c) => categoriasMap.set(c.id, c))

    const list: ItemAlertaVencimento[] = []
    let vencidos = 0
    let vencendo = 0

    allVistoriaItens.forEach((item) => {
      // Ignora itens onde o hospital marcou "Não" ou "Não se aplica"
      if (item.possuiSistema === 'Não' || item.possuiSistema === 'Não se aplica') {
        return
      }

      // Procura subitem correspondente
      const sub = item.subitem ? subitensMap.get(item.subitem) : null
      const cat = item.categoria ? categoriasMap.get(item.categoria) : null

      // Periodicidade em dias (do subitem ou herdada da categoria)
      const periodicidade =
        sub?.periodicidadeDias && sub.periodicidadeDias > 0
          ? sub.periodicidadeDias
          : cat?.periodicidadeDias && cat.periodicidadeDias > 0
            ? cat.periodicidadeDias
            : 0

      const dataServico = item.dataUltimoServico || item.dataUltimaVerificacao
      const dataArt = item.dataUltimaArt
      const periodMeses = item.periodicidadeMeses

      // Se não tem periodicidade em dias e nem periodicidade em meses válida, não há o que calcular
      const temPeriodicidade =
        periodicidade > 0 || (periodMeses !== undefined && periodMeses !== null && periodMeses > 0)
      if (!temPeriodicidade) {
        return
      }

      // Se não tem nem data do último serviço nem data da ART, não calcula
      if (!dataServico && !dataArt) {
        return
      }

      const calc = calcularVencimentoSubitem(dataServico, periodicidade, {
        periodicidadeMeses: periodMeses,
        dataUltimaArt: dataArt,
      })

      if (calc.status === 'vencido' || calc.status === 'vencendo_em_breve') {
        // Obter dados do hospital
        const vistoria = item.vistoria ? vistoriasMap.get(item.vistoria) : null
        const hospId = item.hospital || vistoria?.hospital || ''
        const hosp = hospId ? hospitaisMap.get(hospId) : null

        let dataFormatada = '—'
        if (dataServico) {
          const rawDate = dataServico.split('T')[0]
          const [y, m, d] = rawDate.split('-')
          dataFormatada = y && m && d ? `${d}/${m}/${y}` : rawDate
        }

        let dataArtFormatada: string | null = null
        if (dataArt) {
          const rawArt = dataArt.split('T')[0]
          const [ay, am, ad] = rawArt.split('-')
          dataArtFormatada = ay && am && ad ? `${ad}/${am}/${ay}` : rawArt
        }

        if (calc.status === 'vencido') vencidos++
        if (calc.status === 'vencendo_em_breve') vencendo++

        list.push({
          itemId: item.id,
          vistoriaId: item.vistoria || '',
          hospitalId: hospId,
          hospitalNome: hosp?.nome || 'Estabelecimento sem nome',
          hospitalTipo: hosp?.tipo || 'Hospital',
          hospitalMunicipio: hosp?.municipio || 'PI',
          hospitalCnes: hosp?.cnes || '',
          subitemDescricao: sub?.descricao || cat?.nome || 'Subitem do checklist',
          subitemCodigo: sub?.codigo || '',
          categoriaNome: cat?.nome || '',
          dataUltimoServicoStr: dataFormatada,
          periodicidadeDias: periodicidade,
          periodicidadeMeses: periodMeses,
          dataUltimaArtStr: dataArtFormatada,
          status: calc.status,
          diasAteVencimento: calc.diasAteVencimento,
          diasVencido: calc.diasVencido,
          dataVencimentoStr: calc.dataVencimentoStr,
          prestadorServico: item.prestadorServico,
          numeroArt: item.numeroArt,
        })
      }
    })

    // Ordenar: primeiro os mais vencidos (maior atraso), depois os mais próximos do vencimento
    list.sort((a, b) => {
      if (a.status === 'vencido' && b.status !== 'vencido') return -1
      if (a.status !== 'vencido' && b.status === 'vencido') return 1
      const diasA = a.diasAteVencimento ?? 0
      const diasB = b.diasAteVencimento ?? 0
      return diasA - diasB
    })

    return {
      itensComAlerta: list,
      vencimentoStats: {
        totalAlertas: vencidos + vencendo,
        vencidosCount: vencidos,
        vencendoEmBreveCount: vencendo,
      },
    }
  }, [allVistoriaItens, allSubitens, allCategorias, allVistorias, hospitais])

  // Itens filtrados para o modal de vencimentos
  const modalFilteredItens = useMemo(() => {
    if (vencimentoTab === 'vencidos') {
      return itensComAlerta.filter((i) => i.status === 'vencido')
    }
    if (vencimentoTab === 'vencendo') {
      return itensComAlerta.filter((i) => i.status === 'vencendo_em_breve')
    }
    return itensComAlerta
  }, [itensComAlerta, vencimentoTab])

  // Overall statistics (unindo atribuições e status global das vistorias registradas)
  const stats = useMemo(() => {
    const totalAtribuicoes = details.length
    const concluidas = details.filter((d) => d.isConcluida).length
    const pendentes = totalAtribuicoes - concluidas
    const percentualGeral =
      totalAtribuicoes > 0 ? Math.round((concluidas / totalAtribuicoes) * 100) : 0

    const fiscaisComAtribuicaoCount = new Set(details.map((d) => d.atribuicao.fiscal)).size

    // Contagem direta da base de vistorias
    const totalVistoriasRegistradas = allVistorias.length
    const vistoriasConcluidasCount = allVistorias.filter((v) => v.status === 'concluida').length
    const vistoriasEmAndamentoCount = allVistorias.filter((v) => v.status !== 'concluida').length

    return {
      totalAtribuicoes,
      concluidas,
      pendentes,
      percentualGeral,
      fiscaisComAtribuicaoCount,
      totalFiscais: fiscais.length,
      totalEmpreendimentos: hospitais.length,
      totalVistoriasRegistradas,
      vistoriasConcluidasCount,
      vistoriasEmAndamentoCount,
    }
  }, [details, fiscais, hospitais, allVistorias])

  // Group by fiscal summary
  const fiscaisSummary = useMemo<FiscalProgressSummary[]>(() => {
    return fiscais.map((f) => {
      const fiscalDetails = details.filter((d) => d.atribuicao.fiscal === f.id)
      const concluidos = fiscalDetails.filter((d) => d.isConcluida).length
      const pendentes = fiscalDetails.length - concluidos

      return {
        fiscalId: f.id,
        fiscalName: f.name || f.email,
        fiscalEmail: f.email,
        totalAtribuidos: fiscalDetails.length,
        concluidos,
        pendentes,
        atribuicoes: fiscalDetails,
      }
    })
  }, [fiscais, details])

  // Filtered details list for direct table/card view
  const filteredDetails = useMemo(() => {
    return details.filter((d) => {
      // Fiscal filter
      if (selectedFiscalFiltro !== 'todos' && d.atribuicao.fiscal !== selectedFiscalFiltro) {
        return false
      }

      // Status filter
      if (selectedStatusFiltro === 'concluidas' && !d.isConcluida) return false
      if (selectedStatusFiltro === 'pendentes' && d.isConcluida) return false

      // Tipo filter
      if (selectedTipoFiltro !== 'todos') {
        const hTipo = (d.hospital?.tipo || 'Hospital').trim().toLowerCase()
        if (hTipo !== selectedTipoFiltro.trim().toLowerCase()) return false
      }

      // Search query
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      const fiscalName = (d.atribuicao.expand?.fiscal?.name || '').toLowerCase()
      const hospNome = (d.hospital?.nome || '').toLowerCase()
      const municipio = (d.hospital?.municipio || '').toLowerCase()
      const cnes = (d.hospital?.cnes || '').toLowerCase()

      return (
        fiscalName.includes(q) || hospNome.includes(q) || municipio.includes(q) || cnes.includes(q)
      )
    })
  }, [details, selectedFiscalFiltro, selectedStatusFiltro, selectedTipoFiltro, searchQuery])

  // Iniciar Fiscalização na lista de atribuições com modal de conferência pré-vistoria
  const handleIniciarFiscalizacaoClick = (detail: AtribuicaoDetail) => {
    const hosp = detail.hospital
    if (!hosp) return
    setSelectedHospitalForModal(hosp)
    setIsIniciarModalOpen(true)
  }

  const handleConfirmPreVistoria = async (updatedHospital: Hospital) => {
    try {
      // Atualiza o hospital localmente na lista caso tenha mudado dados
      setHospitais((prev) => prev.map((h) => (h.id === updatedHospital.id ? updatedHospital : h)))
      setDetails((prev) =>
        prev.map((d) =>
          d.hospital?.id === updatedHospital.id ? { ...d, hospital: updatedHospital } : d,
        ),
      )

      // Cria ou recupera vistoria ativa para o hospital
      const vistoria = await vistoriasService.getOrCreateForHospital(updatedHospital.id)

      setIsIniciarModalOpen(false)
      setSelectedHospitalForModal(null)

      toast({
        title: 'Vistoria carregada',
        description: `Vistoria vinculada a "${updatedHospital.nome}".`,
      })

      navigate(`/vistoria?hospitalId=${updatedHospital.id}&vistoriaId=${vistoria.id}`)
    } catch (err) {
      console.error('Erro ao iniciar fiscalização:', err)
      toast({
        title: 'Erro ao iniciar vistoria',
        description: 'Não foi possível carregar ou criar a vistoria para este hospital.',
        variant: 'destructive',
      })
    }
  }

  // Open modal with pre-selected fiscal
  const handleOpenAssignForFiscal = (fiscalId: string) => {
    setModalPreFiscalId(fiscalId)
    setModalPreHospitalId(undefined)
    setIsModalOpen(true)
  }

  // Delete atribuicao handler
  const handleDeleteAtribuicao = async () => {
    if (!atribuicaoToDelete) return
    try {
      setIsDeleting(true)
      await atribuicoesService.delete(atribuicaoToDelete.atribuicao.id)
      toast({
        title: 'Atribuição removida',
        description: 'O empreendimento foi desvinculado do fiscal.',
      })
      setAtribuicaoToDelete(null)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir atribuição:', err)
      toast({
        title: 'Erro ao remover atribuição',
        description: 'Não foi possível desvincular o empreendimento.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="animate-page-enter space-y-8 pb-16">
      {/* 1. Header do Administrador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D3DFE9] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] sm:text-[28px] font-bold text-[#102A43] tracking-tight leading-tight flex items-center gap-2.5">
              <Shield className="w-7 h-7 text-[#004B8D]" />
              Painel Geral de Fiscalizações
            </h1>
          </div>
          <p className="text-sm text-[#486581] mt-0.5">
            Gestão executiva de atribuição de vistorias, monitoramento por fiscal e progresso de
            checklists
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <Button
            onClick={() => {
              setModalPreFiscalId(undefined)
              setModalPreHospitalId(undefined)
              setIsModalOpen(true)
            }}
            className="bg-[#004B8D] hover:bg-[#003666] text-white shadow-sm font-semibold h-10 px-4 cursor-pointer gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Atribuir Fiscalização
          </Button>

          <Button
            variant="outline"
            onClick={loadData}
            disabled={isLoading}
            className="border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8] font-semibold h-10 px-3 cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 2. Cards de Métricas Gerais do Administrador (Vistorias Em Andamento / Concluídas, Alerta de Vencimentos e Atribuições) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Vistorias */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#D3DFE9] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#486581] uppercase tracking-wider">
            <span>Total Vistorias</span>
            <ClipboardList className="w-4 h-4 text-[#004B8D]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#102A43]">
              {stats.totalVistoriasRegistradas}
            </span>
            <span className="text-xs font-semibold text-[#627D98]">registradas</span>
          </div>
          <div className="text-[11px] text-[#627D98]">
            {stats.totalEmpreendimentos} unidades cadastradas
          </div>
        </div>

        {/* Vistorias em Andamento */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase tracking-wider">
            <span>Em Andamento</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-900">
              {stats.vistoriasEmAndamentoCount}
            </span>
            <span className="text-xs font-semibold text-amber-700">em campo</span>
          </div>
          <div className="text-[11px] text-[#627D98]">Checklists abertos</div>
        </div>

        {/* Vistorias Concluídas */}
        <div className="bg-emerald-50/70 p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <span>Concluídas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-900">
              {stats.vistoriasConcluidasCount}
            </span>
            <span className="text-xs font-bold text-emerald-700">finalizadas</span>
          </div>
          <div className="text-[11px] text-emerald-700">Checklists travados</div>
        </div>

        {/* NOVO CARD: Alerta de Vencimento de Serviços (Clicável) */}
        <button
          type="button"
          onClick={() => {
            setVencimentoTab('todos')
            setIsVencimentoModalOpen(true)
          }}
          className={`text-left p-4 sm:p-5 rounded-2xl border shadow-xs space-y-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.99] ${
            vencimentoStats.totalAlertas > 0
              ? vencimentoStats.vencidosCount > 0
                ? 'bg-rose-50/80 border-rose-300 hover:border-rose-400 hover:shadow-md'
                : 'bg-amber-50/80 border-amber-300 hover:border-amber-400 hover:shadow-md'
              : 'bg-white border-[#D3DFE9] hover:border-[#004B8D]/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span
              className={
                vencimentoStats.vencidosCount > 0
                  ? 'text-rose-800'
                  : vencimentoStats.vencendoEmBreveCount > 0
                    ? 'text-amber-800'
                    : 'text-[#486581]'
              }
            >
              Alerta Prazos
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${
                vencimentoStats.vencidosCount > 0
                  ? 'text-rose-600 animate-pulse'
                  : vencimentoStats.vencendoEmBreveCount > 0
                    ? 'text-amber-600'
                    : 'text-[#627D98]'
              }`}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-extrabold ${
                vencimentoStats.vencidosCount > 0
                  ? 'text-rose-900'
                  : vencimentoStats.vencendoEmBreveCount > 0
                    ? 'text-amber-900'
                    : 'text-[#102A43]'
              }`}
            >
              {vencimentoStats.totalAlertas}
            </span>
            <span className="text-xs font-bold text-[#627D98]">itens</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
              {vencimentoStats.vencidosCount} vencido(s)
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
              {vencimentoStats.vencendoEmBreveCount} a vencer
            </span>
          </div>
        </button>

        {/* Fiscais na Equipe */}
        <div className="col-span-2 md:col-span-1 bg-[#E8F1F8]/80 p-4 sm:p-5 rounded-2xl border border-[#004B8D]/20 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#004B8D] uppercase tracking-wider">
            <span>Equipe Técnica</span>
            <Users className="w-4 h-4 text-[#004B8D]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#004B8D]">
              {stats.totalFiscais}
            </span>
            <span className="text-xs text-[#004B8D]/80">fiscais</span>
          </div>
          <div className="text-[11px] text-[#004B8D]/80">
            {stats.totalAtribuicoes} unidades atribuídas
          </div>
        </div>
      </div>

      {/* 3. Visão Agrupada por Fiscal (Painel de Progresso Individual) */}
      <div className="bg-white rounded-2xl border border-[#D3DFE9] p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D3DFE9] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#102A43] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#004B8D]" />
              Progresso por Fiscal da Equipe
            </h2>
            <p className="text-xs text-[#486581]">
              Acompanhamento detalhado das vistorias atribuídas a cada fiscal e status de conclusão
            </p>
          </div>

          <Badge className="bg-[#E8F1F8] text-[#004B8D] border-0 text-xs font-bold self-start sm:self-auto py-1 px-3">
            {fiscais.length} fiscais cadastrados
          </Badge>
        </div>

        {fiscaisSummary.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#627D98]">
            Nenhum fiscal aprovado encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fiscaisSummary.map((item) => {
              const perc =
                item.totalAtribuidos > 0
                  ? Math.round((item.concluidos / item.totalAtribuidos) * 100)
                  : 0

              return (
                <div
                  key={item.fiscalId}
                  className="rounded-xl border border-[#D3DFE9] bg-slate-50/50 p-4 hover:border-[#004B8D]/40 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#004B8D] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                          {item.fiscalName[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-[#102A43] truncate">
                            {item.fiscalName}
                          </h4>
                          <span className="text-[11px] text-[#627D98] block truncate font-mono">
                            {item.fiscalEmail}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Progresso do Fiscal */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#486581] font-semibold">Conclusão:</span>
                        <span className="font-bold text-[#004B8D]">{perc}%</span>
                      </div>
                      <Progress value={perc} className="h-2 bg-[#D3DFE9]" />
                    </div>

                    {/* Stats pills */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
                      <div className="p-1.5 rounded-lg bg-white border border-[#D3DFE9]">
                        <span className="text-[10px] text-[#627D98] block">Atribuídos</span>
                        <span className="text-sm font-bold text-[#102A43]">
                          {item.totalAtribuidos}
                        </span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                        <span className="text-[10px] text-emerald-800 block">Concluídos</span>
                        <span className="text-sm font-bold text-emerald-900">
                          {item.concluidos}
                        </span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200">
                        <span className="text-[10px] text-amber-800 block">Pendentes</span>
                        <span className="text-sm font-bold text-amber-900">{item.pendentes}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#D3DFE9]/80">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenAssignForFiscal(item.fiscalId)}
                      className="w-full text-xs h-8 border-[#004B8D]/30 text-[#004B8D] hover:bg-[#E8F1F8] font-semibold cursor-pointer gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Atribuir mais
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedFiscalFiltro(item.fiscalId)}
                      className="h-8 px-2.5 text-xs text-[#486581] hover:text-[#102A43] hover:bg-slate-200/50"
                      title="Filtrar tabela por este fiscal"
                    >
                      Ver lista
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 4. Lista Geral de Atribuições com Filtros Completos */}
      <div className="bg-white rounded-2xl border border-[#D3DFE9] p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D3DFE9] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#102A43] flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#004B8D]" />
              Todas as Fiscalizações Atribuídas ({filteredDetails.length})
            </h2>
            <p className="text-xs text-[#486581]">
              Visão detalhada de cada unidade atribuída, percentual do checklist preenchido e ações
              diretas
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => {
              setModalPreFiscalId(undefined)
              setModalPreHospitalId(undefined)
              setIsModalOpen(true)
            }}
            className="bg-[#004B8D] hover:bg-[#003666] text-white font-semibold text-xs h-9 px-3.5 gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Atribuição
          </Button>
        </div>

        {/* Filtros da Tabela */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#F4F6F9] p-3.5 rounded-xl border border-[#D3DFE9]">
          {/* Busca por texto */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar unidade, fiscal, município..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-xs border-[#D3DFE9] bg-white focus-visible:ring-[#004B8D]"
            />
          </div>

          {/* Filtro por Fiscal */}
          <Select value={selectedFiscalFiltro} onValueChange={setSelectedFiscalFiltro}>
            <SelectTrigger className="h-9 border-[#D3DFE9] text-xs bg-white">
              <div className="flex items-center gap-1.5 truncate">
                <Users className="w-3.5 h-3.5 text-[#004B8D]" />
                <span className="text-[#627D98]">Fiscal:</span>
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os fiscais ({details.length})</SelectItem>
              {fiscais.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name || f.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por Status */}
          <Select value={selectedStatusFiltro} onValueChange={setSelectedStatusFiltro}>
            <SelectTrigger className="h-9 border-[#D3DFE9] text-xs bg-white">
              <div className="flex items-center gap-1.5 truncate">
                <Filter className="w-3.5 h-3.5 text-[#004B8D]" />
                <span className="text-[#627D98]">Status:</span>
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="pendentes">Apenas Pendentes</SelectItem>
              <SelectItem value="concluidas">Apenas Concluídas</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por Segmento / Tipo */}
          <Select value={selectedTipoFiltro} onValueChange={setSelectedTipoFiltro}>
            <SelectTrigger className="h-9 border-[#D3DFE9] text-xs bg-white">
              <div className="flex items-center gap-1.5 truncate">
                <Layers className="w-3.5 h-3.5 text-[#004B8D]" />
                <span className="text-[#627D98]">Segmento:</span>
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os segmentos</SelectItem>
              {tipos.map((t) => (
                <SelectItem key={t.id} value={t.nome}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Atribuições */}
        {isLoading ? (
          <div className="py-16 text-center text-[#486581]">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#004B8D] mb-2" />
            <p className="text-xs font-semibold">Carregando atribuições de fiscalização...</p>
          </div>
        ) : filteredDetails.length === 0 ? (
          <div className="p-12 text-center bg-[#F4F6F9]/60 rounded-xl border border-dashed border-[#D3DFE9] space-y-3">
            <ClipboardCheck className="w-10 h-10 text-[#829AB1] mx-auto stroke-[1.5]" />
            <h4 className="text-sm font-bold text-[#102A43]">Nenhuma atribuição encontrada</h4>
            <p className="text-xs text-[#486581] max-w-sm mx-auto">
              {searchQuery ||
              selectedFiscalFiltro !== 'todos' ||
              selectedStatusFiltro !== 'todos' ||
              selectedTipoFiltro !== 'todos'
                ? 'Nenhum resultado corresponde aos filtros selecionados.'
                : 'Utilize o botão "Atribuir Fiscalização" para delegar vistorias aos fiscais da equipe.'}
            </p>
            {(searchQuery ||
              selectedFiscalFiltro !== 'todos' ||
              selectedStatusFiltro !== 'todos' ||
              selectedTipoFiltro !== 'todos') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedFiscalFiltro('todos')
                  setSelectedStatusFiltro('todos')
                  setSelectedTipoFiltro('todos')
                }}
                className="border-[#D3DFE9] text-[#004B8D] text-xs cursor-pointer"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#D3DFE9] border border-[#D3DFE9] rounded-xl overflow-hidden bg-white">
            {filteredDetails.map((detail) => {
              const fiscal = detail.atribuicao.expand?.fiscal
              const hosp = detail.hospital
              const hospTipo = hosp?.tipo || 'Hospital'

              return (
                <div
                  key={detail.atribuicao.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  {/* Left: Hospital & Fiscal Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-sm text-[#102A43] leading-snug">
                        {hosp?.nome || 'Unidade não encontrada'}
                      </h4>
                      <Badge className="bg-[#E8F1F8] text-[#004B8D] border border-[#004B8D]/20 text-[10px] font-bold">
                        {hospTipo}
                      </Badge>
                      {detail.vistoria?.status === 'concluida' || detail.isConcluida ? (
                        <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Concluída
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Em andamento ({detail.itensRespondidosCount}/{detail.totalItensChecklist})
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#486581]">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#004B8D]" />
                        Fiscal:{' '}
                        <strong className="text-[#102A43]">
                          {fiscal?.name || fiscal?.email || 'Não definido'}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Município: <strong>{hosp?.municipio}</strong>
                      </span>
                      <span>•</span>
                      <span className="font-mono">CNES: {hosp?.cnes}</span>
                      {detail.atribuicao.prazo && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[#004B8D]">
                            <Calendar className="w-3.5 h-3.5" />
                            Prazo:{' '}
                            {detail.atribuicao.prazo.split('T')[0].split('-').reverse().join('/')}
                          </span>
                        </>
                      )}
                    </div>

                    {detail.atribuicao.observacao && (
                      <p className="text-[11px] text-[#627D98] bg-[#F4F6F9] px-2.5 py-1 rounded-md max-w-xl">
                        <strong>Obs:</strong> {detail.atribuicao.observacao}
                      </p>
                    )}
                  </div>

                  {/* Middle: Checklist Progress */}
                  <div className="w-full md:w-48 space-y-1.5 shrink-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#627D98] font-medium">Checklist Técnico:</span>
                      <span
                        className={`font-bold ${detail.isConcluida ? 'text-emerald-700' : 'text-[#004B8D]'}`}
                      >
                        {detail.percentual}%
                      </span>
                    </div>
                    <Progress
                      value={detail.percentual}
                      className={`h-2 ${detail.isConcluida ? '[&>div]:bg-emerald-600' : '[&>div]:bg-[#004B8D]'}`}
                    />
                    <div className="text-[10px] text-[#627D98] text-right">
                      {detail.itensRespondidosCount} de {detail.totalItensChecklist} itens
                      respondidos
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleIniciarFiscalizacaoClick(detail)}
                      className="bg-[#004B8D] hover:bg-[#003666] text-white font-bold text-xs h-8 px-3 cursor-pointer shadow-xs gap-1.5"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      Iniciar Fiscalização
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAtribuicaoToDelete(detail)}
                      className="h-8 w-8 p-0 text-[#829AB1] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Desvincular atribuição"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Atribuição */}
      <AtribuirFiscalizacaoModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        fiscais={fiscais}
        hospitais={hospitais}
        tipos={tipos}
        preSelectedFiscalId={modalPreFiscalId}
        preSelectedHospitalId={modalPreHospitalId}
        onSuccess={loadData}
      />

      {/* Modal de Conferência de Dados Pré-Vistoria */}
      {selectedHospitalForModal && (
        <IniciarVistoriaModal
          open={isIniciarModalOpen}
          onOpenChange={(open) => {
            setIsIniciarModalOpen(open)
            if (!open) setSelectedHospitalForModal(null)
          }}
          hospital={selectedHospitalForModal}
          onConfirmAndContinue={handleConfirmPreVistoria}
        />
      )}

      {/* Confirm Delete Atribuição Dialog */}
      <AlertDialog
        open={!!atribuicaoToDelete}
        onOpenChange={(open) => !open && setAtribuicaoToDelete(null)}
      >
        <AlertDialogContent className="border-[#D3DFE9] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#102A43]">
              Desvincular Fiscalização
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#486581]">
              Tem certeza que deseja desvincular a vistoria de &ldquo;
              {atribuicaoToDelete?.hospital?.nome}&rdquo; do fiscal &ldquo;
              {atribuicaoToDelete?.atribuicao?.expand?.fiscal?.name}&rdquo;? As respostas de
              vistorias já salvas permanecerão no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#D3DFE9] text-[#486581] cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAtribuicao}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
            >
              {isDeleting ? 'Removendo...' : 'Sim, Desvincular'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal / Dialog de Alerta de Vencimento de Prazos */}
      <Dialog open={isVencimentoModalOpen} onOpenChange={setIsVencimentoModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white border-[#D3DFE9]">
          <DialogHeader className="p-6 pb-4 border-b border-[#D3DFE9] bg-slate-50/50">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <DialogTitle className="text-lg font-bold text-[#102A43] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  Prazos e Vencimentos de Serviços ({vencimentoStats.totalAlertas})
                </DialogTitle>
                <DialogDescription className="text-xs text-[#486581]">
                  Subitens de checklist com periodicidade definida que estão vencidos ou vencendo em
                  até 30 dias nos estabelecimentos fiscalizados.
                </DialogDescription>
              </div>
            </div>

            {/* Abas de filtro: Todos / Vencidos / Vencendo */}
            <div className="flex items-center gap-2 pt-3">
              <button
                type="button"
                onClick={() => setVencimentoTab('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  vencimentoTab === 'todos'
                    ? 'bg-[#004B8D] text-white shadow-xs'
                    : 'bg-white text-[#486581] hover:bg-slate-100 border border-[#D3DFE9]'
                }`}
              >
                Todos ({vencimentoStats.totalAlertas})
              </button>
              <button
                type="button"
                onClick={() => setVencimentoTab('vencidos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  vencimentoTab === 'vencidos'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                Vencidos ({vencimentoStats.vencidosCount})
              </button>
              <button
                type="button"
                onClick={() => setVencimentoTab('vencendo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  vencimentoTab === 'vencendo'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                Vencendo em breve ({vencimentoStats.vencendoEmBreveCount})
              </button>
            </div>
          </DialogHeader>

          {/* Lista de Itens com Scroll */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {modalFilteredItens.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-[#102A43]">
                  Nenhum item com prazo pendente neste filtro!
                </h4>
                <p className="text-xs text-[#627D98] max-w-sm mx-auto">
                  Todos os serviços com periodicidade informada estão regulares ou não foram
                  preenchidos com data expirada.
                </p>
              </div>
            ) : (
              modalFilteredItens.map((alerta) => (
                <div
                  key={alerta.itemId}
                  className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                    alerta.status === 'vencido'
                      ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                      : 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                  }`}
                >
                  {/* Linha Superior: Estabelecimento e Tag de Vencimento */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-[#D3DFE9]/60 pb-2.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#004B8D] shrink-0" />
                        <h4 className="font-bold text-sm text-[#102A43]">{alerta.hospitalNome}</h4>
                        <Badge className="bg-[#E8F1F8] text-[#004B8D] border border-[#004B8D]/20 text-[10px] font-bold">
                          {alerta.hospitalTipo}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[#627D98]">
                        Município:{' '}
                        <strong className="text-[#102A43]">{alerta.hospitalMunicipio}</strong> •
                        CNES: {alerta.hospitalCnes || '—'}
                      </p>
                    </div>

                    <div className="shrink-0 self-start sm:self-auto">
                      {alerta.status === 'vencido' ? (
                        <Badge className="bg-rose-600 text-white font-bold text-xs gap-1 shadow-2xs">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Vencido há {alerta.diasVencido}{' '}
                          {alerta.diasVencido === 1 ? 'dia' : 'dias'}
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-600 text-white font-bold text-xs gap-1 shadow-2xs">
                          <Clock className="w-3.5 h-3.5" />
                          Vence em {alerta.diasAteVencimento}{' '}
                          {alerta.diasAteVencimento === 1 ? 'dia' : 'dias'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Detalhes do Subitem */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-baseline gap-2">
                      {alerta.subitemCodigo && (
                        <span className="font-mono font-bold text-[#004B8D] bg-white px-2 py-0.5 rounded border border-[#004B8D]/20 shrink-0">
                          {alerta.subitemCodigo}
                        </span>
                      )}
                      <span className="font-semibold text-[#102A43] leading-snug">
                        {alerta.subitemDescricao}
                      </span>
                    </div>

                    {alerta.categoriaNome && (
                      <p className="text-[11px] text-[#627D98]">
                        Grupo / Categoria: <strong>{alerta.categoriaNome}</strong>
                      </p>
                    )}
                  </div>

                  {/* Informações da Data e Prazo */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 text-xs bg-white p-2.5 rounded-lg border border-[#D3DFE9]/80">
                    <div>
                      <span className="text-[10px] text-[#627D98] block">
                        Data do Último Serviço:
                      </span>
                      <strong className="text-[#102A43] flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-[#004B8D]" />
                        {alerta.dataUltimoServicoStr}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#627D98] block">Data da Última ART:</span>
                      <strong className="text-[#004B8D] flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-[#004B8D]" />
                        {alerta.dataUltimaArtStr || '—'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#627D98] block">Periodicidade:</span>
                      <strong className="text-[#102A43]">
                        {alerta.periodicidadeMeses
                          ? `${alerta.periodicidadeMeses} ${alerta.periodicidadeMeses === 1 ? 'mês' : 'meses'}`
                          : alerta.periodicidadeDias > 0
                            ? `${alerta.periodicidadeDias} dias`
                            : '—'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#627D98] block">
                        Data Limite de Validade:
                      </span>
                      <strong
                        className={`font-mono ${
                          alerta.status === 'vencido' ? 'text-rose-700' : 'text-amber-800'
                        }`}
                      >
                        {alerta.dataVencimentoStr}
                      </strong>
                    </div>
                  </div>

                  {/* Botão de Ação: Abrir Checklist da Vistoria */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-[#627D98] truncate max-w-sm">
                      {alerta.prestadorServico && (
                        <span>
                          Prestador: <strong>{alerta.prestadorServico}</strong>
                        </span>
                      )}
                      {alerta.numeroArt && (
                        <span className="ml-2 font-mono">ART: {alerta.numeroArt}</span>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        setIsVencimentoModalOpen(false)
                        navigate(
                          `/vistoria?hospitalId=${alerta.hospitalId}${
                            alerta.vistoriaId ? `&vistoriaId=${alerta.vistoriaId}` : ''
                          }`,
                        )
                      }}
                      className="bg-[#004B8D] hover:bg-[#003666] text-white text-xs h-7 px-3 font-semibold cursor-pointer gap-1 shrink-0 ml-2"
                    >
                      <ClipboardCheck className="w-3 h-3" />
                      Ver no Checklist
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="p-4 border-t border-[#D3DFE9] bg-slate-50/50 flex sm:justify-between items-center">
            <span className="text-xs text-[#627D98]">
              {vencimentoStats.vencidosCount} vencido(s) • {vencimentoStats.vencendoEmBreveCount}{' '}
              vencendo em ≤ 30 dias
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVencimentoModalOpen(false)}
              className="border-[#D3DFE9] text-[#486581] cursor-pointer"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
