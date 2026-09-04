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
import { usersService, UserProfile } from '@/services/auth'
import { hospitaisService, Hospital } from '@/services/hospitais'
import { tiposEmpreendimentoService, TipoEmpreendimento } from '@/services/tiposEmpreendimento'
import { categoriasVistoriaService, CategoriaVistoria } from '@/services/categoriasVistoria'
import { vistoriasService, Vistoria } from '@/services/vistorias'
import {
  atribuicoesService,
  Atribuicao,
  AtribuicaoDetail,
  FiscalProgressSummary,
} from '@/services/atribuicoes'
import { AtribuirFiscalizacaoModal } from '@/components/AtribuirFiscalizacaoModal'
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
  const [allVistorias, setAllVistorias] = useState<Vistoria[]>([])
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([])
  const [details, setDetails] = useState<AtribuicaoDetail[]>([])

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

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [usersList, hospList, tiposList, catList, atribList, vistoriasList] = await Promise.all(
        [
          usersService.getAll(),
          hospitaisService.getAll(),
          tiposEmpreendimentoService.getAll(),
          categoriasVistoriaService.getAll(),
          atribuicoesService.getAll(),
          vistoriasService.getAll(),
        ],
      )

      const approvedUsers = usersList.filter((u) => u.approved || u.approvalStatus === 'aprovado')
      setFiscais(approvedUsers)
      setHospitais(hospList)
      setTipos(tiposList)
      setAllCategorias(catList)
      setAllVistorias(vistoriasList)
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

      {/* 2. Cards de Métricas Gerais do Administrador (Vistorias Em Andamento / Concluídas e Atribuições) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vistorias em Andamento */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase tracking-wider">
            <span>Vistorias em Andamento</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-900">
              {stats.vistoriasEmAndamentoCount}
            </span>
            <span className="text-xs font-semibold text-amber-700">em campo</span>
          </div>
          <div className="text-[11px] text-[#627D98]">Checklists abertos para preenchimento</div>
        </div>

        {/* Vistorias Concluídas */}
        <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <span>Vistorias Concluídas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-900">
              {stats.vistoriasConcluidasCount}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              de {stats.totalVistoriasRegistradas} vistorias
            </span>
          </div>
          <div className="text-[11px] text-emerald-700">Finalizadas e travadas</div>
        </div>

        {/* Total Atribuições */}
        <div className="bg-white p-5 rounded-2xl border border-[#D3DFE9] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#486581] uppercase tracking-wider">
            <span>Total Atribuído</span>
            <Building2 className="w-4 h-4 text-[#004B8D]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#102A43]">{stats.totalAtribuicoes}</span>
            <span className="text-xs text-[#627D98]">unidades</span>
          </div>
          <div className="text-[11px] text-[#627D98]">
            Distribuídas em {stats.fiscaisComAtribuicaoCount} fiscal(is)
          </div>
        </div>

        {/* Fiscais na Equipe */}
        <div className="bg-[#E8F1F8]/80 p-5 rounded-2xl border border-[#004B8D]/20 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#004B8D] uppercase tracking-wider">
            <span>Equipe Técnica</span>
            <Users className="w-4 h-4 text-[#004B8D]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#004B8D]">{stats.totalFiscais}</span>
            <span className="text-xs text-[#004B8D]/80">fiscais</span>
          </div>
          <div className="text-[11px] text-[#004B8D]/80">
            {stats.totalEmpreendimentos} unidades cadastradas
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
                      onClick={() => {
                        if (hosp) {
                          navigate(
                            `/vistoria?hospitalId=${hosp.id}${detail.vistoria ? `&vistoriaId=${detail.vistoria.id}` : ''}`,
                          )
                        }
                      }}
                      className="bg-[#004B8D] hover:bg-[#003666] text-white font-bold text-xs h-8 px-3 cursor-pointer shadow-xs gap-1.5"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      Abrir Checklist
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
    </div>
  )
}
