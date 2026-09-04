import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Check,
  FileCheck2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { categoriasVistoriaService, CategoriaVistoria } from '@/services/categoriasVistoria'
import { tiposEmpreendimentoService, TipoEmpreendimento } from '@/services/tiposEmpreendimento'
import { atribuicoesService, Atribuicao, AtribuicaoDetail } from '@/services/atribuicoes'
import { useToast } from '@/hooks/use-toast'

export default function FiscalDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([])
  const [details, setDetails] = useState<AtribuicaoDetail[]>([])
  const [tipos, setTipos] = useState<TipoEmpreendimento[]>([])
  const [allCategorias, setAllCategorias] = useState<CategoriaVistoria[]>([])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatusFiltro, setSelectedStatusFiltro] = useState<string>('todos')
  const [selectedTipoFiltro, setSelectedTipoFiltro] = useState<string>('todos')

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      setIsLoading(true)
      const [userAtribs, tiposList, catList] = await Promise.all([
        atribuicoesService.getByFiscal(user.id),
        tiposEmpreendimentoService.getAll(),
        categoriasVistoriaService.getAll(),
      ])

      setAtribuicoes(userAtribs)
      setTipos(tiposList)
      setAllCategorias(catList)

      const computedDetails = await atribuicoesService.computeAtribuicoesProgress(
        userAtribs,
        catList,
      )
      setDetails(computedDetails)
    } catch (err) {
      console.error('Erro ao carregar atribuições do fiscal:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível buscar as vistorias atribuídas.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, toast])

  useEffect(() => {
    document.title = 'Minhas Fiscalizações · CREA-PI Fiscalização'
    loadData()
  }, [loadData])

  // Statistics for this logged-in fiscal
  const stats = useMemo(() => {
    const total = details.length
    const concluidas = details.filter((d) => d.isConcluida).length
    const pendentes = total - concluidas
    const percentualGeral = total > 0 ? Math.round((concluidas / total) * 100) : 0

    return {
      total,
      concluidas,
      pendentes,
      percentualGeral,
    }
  }, [details])

  // Filtered list
  const filteredDetails = useMemo(() => {
    return details.filter((d) => {
      // Status filter
      if (selectedStatusFiltro === 'concluidas' && !d.isConcluida) return false
      if (selectedStatusFiltro === 'pendentes' && d.isConcluida) return false

      // Tipo filter
      if (selectedTipoFiltro !== 'todos') {
        const hTipo = (d.hospital?.tipo || 'Hospital').trim().toLowerCase()
        if (hTipo !== selectedTipoFiltro.trim().toLowerCase()) return false
      }

      // Search
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      const hospNome = (d.hospital?.nome || '').toLowerCase()
      const municipio = (d.hospital?.municipio || '').toLowerCase()
      const cnes = (d.hospital?.cnes || '').toLowerCase()

      return hospNome.includes(q) || municipio.includes(q) || cnes.includes(q)
    })
  }, [details, selectedStatusFiltro, selectedTipoFiltro, searchQuery])

  return (
    <div className="animate-page-enter space-y-6 sm:space-y-8 pb-16 w-full max-w-full overflow-x-hidden">
      {/* 1. Header do Fiscal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-[#D3DFE9] pb-4 sm:pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-[28px] font-bold text-[#102A43] tracking-tight leading-tight flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 sm:w-7 sm:h-7 text-[#004B8D] shrink-0" />
              <span>Minhas Fiscalizações Atribuídas</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#486581] mt-0.5">
            Olá, <strong>{user?.name || user?.email}</strong>. Acompanhe os empreendimentos
            delegados a você e preencha o checklist de vistoria.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={isLoading}
            className="flex-1 sm:flex-none border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8] font-semibold h-10 px-3.5 cursor-pointer text-xs gap-1.5"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>

          <Button
            onClick={() => navigate('/tipos-empreendimento')}
            variant="outline"
            className="flex-1 sm:flex-none border-[#004B8D]/30 text-[#004B8D] hover:bg-[#E8F1F8] font-semibold h-10 px-3.5 text-xs gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Explorar Catálogo</span>
          </Button>
        </div>
      </div>

      {/* 2. Cards de Resumo de Progresso do Fiscal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Atribuídos */}
        <div className="bg-white p-5 rounded-2xl border border-[#D3DFE9] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#486581] uppercase tracking-wider">
            <span>Atribuídos a Você</span>
            <Building2 className="w-4 h-4 text-[#004B8D]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#102A43]">{stats.total}</span>
            <span className="text-xs text-[#627D98]">unidades</span>
          </div>
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#627D98]">Progresso geral:</span>
              <span className="font-bold text-[#004B8D]">{stats.percentualGeral}%</span>
            </div>
            <Progress value={stats.percentualGeral} className="h-1.5 bg-[#D3DFE9]" />
          </div>
        </div>

        {/* Concluídos */}
        <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <span>Concluídos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-900">{stats.concluidas}</span>
            <span className="text-xs font-bold text-emerald-700">({stats.percentualGeral}%)</span>
          </div>
          <div className="text-[11px] text-emerald-700">
            Todos os itens do checklist respondidos
          </div>
        </div>

        {/* Pendentes */}
        <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase tracking-wider">
            <span>Pendentes / Em Aberto</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-900">{stats.pendentes}</span>
            <span className="text-xs font-bold text-amber-700">
              ({100 - stats.percentualGeral}%)
            </span>
          </div>
          <div className="text-[11px] text-amber-700">Aguardando ou com itens em aberto</div>
        </div>
      </div>

      {/* 3. Lista dos Empreendimentos Atribuídos ao Fiscal */}
      <div className="bg-white rounded-2xl border border-[#D3DFE9] p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D3DFE9] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#102A43] flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#004B8D]" />
              Empreendimentos para Vistoriar ({filteredDetails.length})
            </h2>
            <p className="text-xs text-[#486581]">
              Clique em &ldquo;Iniciar / Continuar Vistoria&rdquo; para preencher o checklist de
              cada unidade
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F4F6F9] p-3.5 rounded-xl border border-[#D3DFE9]">
          <div className="relative sm:col-span-1">
            <Search className="w-3.5 h-3.5 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar unidade, município, CNES..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-xs border-[#D3DFE9] bg-white focus-visible:ring-[#004B8D]"
            />
          </div>

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
              <SelectItem value="pendentes">Apenas Pendentes ({stats.pendentes})</SelectItem>
              <SelectItem value="concluidas">Apenas Concluídas ({stats.concluidas})</SelectItem>
            </SelectContent>
          </Select>

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

        {/* Cards de Unidades Atribuídas */}
        {isLoading ? (
          <div className="py-16 text-center text-[#486581]">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#004B8D] mb-2" />
            <p className="text-xs font-semibold">Carregando suas atribuições...</p>
          </div>
        ) : filteredDetails.length === 0 ? (
          <div className="p-12 text-center bg-[#F4F6F9]/60 rounded-xl border border-dashed border-[#D3DFE9] space-y-3">
            <Building2 className="w-12 h-12 text-[#829AB1] mx-auto stroke-[1.5]" />
            <div className="space-y-1">
              <h4 className="text-base font-bold text-[#102A43]">
                {details.length === 0
                  ? 'Você ainda não possui fiscalizações atribuídas'
                  : 'Nenhuma atribuição encontrada para os filtros aplicados'}
              </h4>
              <p className="text-xs text-[#486581] max-w-md mx-auto">
                {details.length === 0
                  ? 'O administrador do CREA-PI pode atribuir unidades para você vistoriar. Você também pode navegar pelo catálogo de tipos para consultar informações.'
                  : 'Tente alterar os filtros de status ou tipo para visualizar as unidades.'}
              </p>
            </div>
            {details.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDetails.map((detail) => {
              const hosp = detail.hospital
              const hospTipo = hosp?.tipo || 'Hospital'

              return (
                <div
                  key={detail.atribuicao.id}
                  className="rounded-xl border border-[#D3DFE9] bg-white p-5 hover:border-[#004B8D]/50 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <Badge className="bg-[#E8F1F8] text-[#004B8D] border border-[#004B8D]/20 text-xs font-semibold">
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
                          Em andamento
                        </Badge>
                      )}
                    </div>

                    {/* Nome & Localização */}
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-[#102A43] leading-snug line-clamp-2">
                        {hosp?.nome || 'Unidade não encontrada'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#627D98] mt-1.5">
                        <span className="flex items-center gap-1 font-medium text-[#102A43]">
                          <MapPin className="w-3 h-3 text-[#004B8D]" />
                          {hosp?.municipio}
                        </span>
                        <span>•</span>
                        <span className="font-mono">CNES: {hosp?.cnes}</span>
                      </div>
                    </div>

                    {/* Prazo ou Observações se houver */}
                    {detail.atribuicao.prazo && (
                      <div className="text-xs text-[#004B8D] font-semibold flex items-center gap-1.5 bg-[#E8F1F8] px-2.5 py-1 rounded-md">
                        <Calendar className="w-3.5 h-3.5" />
                        Prazo:{' '}
                        {detail.atribuicao.prazo.split('T')[0].split('-').reverse().join('/')}
                      </div>
                    )}

                    {detail.atribuicao.observacao && (
                      <p className="text-[11px] text-[#486581] bg-slate-50 border border-[#D3DFE9] p-2 rounded-md">
                        <strong>Obs:</strong> {detail.atribuicao.observacao}
                      </p>
                    )}

                    {/* Progresso do Checklist */}
                    <div className="space-y-1.5 pt-2 border-t border-[#D3DFE9]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#627D98] font-medium">Checklist Técnico:</span>
                        <span
                          className={`font-bold ${
                            detail.isConcluida ? 'text-emerald-700' : 'text-[#004B8D]'
                          }`}
                        >
                          {detail.percentual}% ({detail.itensRespondidosCount}/
                          {detail.totalItensChecklist})
                        </span>
                      </div>
                      <Progress
                        value={detail.percentual}
                        className={`h-2 ${
                          detail.isConcluida ? '[&>div]:bg-emerald-600' : '[&>div]:bg-[#004B8D]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Ação: Abrir Vistoria */}
                  <Button
                    onClick={() => {
                      if (hosp) {
                        navigate(
                          `/vistoria?hospitalId=${hosp.id}${
                            detail.vistoria ? `&vistoriaId=${detail.vistoria.id}` : ''
                          }`,
                        )
                      }
                    }}
                    className={`w-full font-bold text-xs h-10 sm:h-9 cursor-pointer shadow-xs gap-2 ${
                      detail.isConcluida
                        ? 'bg-slate-700 hover:bg-slate-800 text-white'
                        : 'bg-[#004B8D] hover:bg-[#003666] text-white'
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {detail.isConcluida ? 'Ver Vistoria Concluída' : 'Preencher Checklist'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 ml-auto shrink-0" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
