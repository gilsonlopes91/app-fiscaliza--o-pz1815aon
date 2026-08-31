import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  SlidersHorizontal,
  FileCheck2,
  Search,
  CheckCircle2,
  HelpCircle,
  Building,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Save,
  X,
  AlertCircle,
  Briefcase,
  Store,
  Factory,
  Hotel,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  tiposEmpreendimentoService,
  TipoEmpreendimento,
  TipoEmpreendimentoFormData,
} from '@/services/tiposEmpreendimento'
import {
  categoriasVistoriaService,
  CategoriaVistoria,
  CategoriaVistoriaFormData,
} from '@/services/categoriasVistoria'
import { hospitaisService, Hospital } from '@/services/hospitais'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

// Icon registry matching CREA-PI engineering and healthcare visual identity
export const ICON_OPTIONS = [
  { id: 'Building2', label: 'Hospital / Prédio', icon: Building2 },
  { id: 'Stethoscope', label: 'Clínica / Saúde', icon: Stethoscope },
  { id: 'FlaskConical', label: 'Laboratório', icon: FlaskConical },
  { id: 'Scan', label: 'Diagnóstico por Imagem', icon: Scan },
  { id: 'HeartPulse', label: 'Posto de Saúde / UBS', icon: HeartPulse },
  { id: 'Activity', label: 'Pronto Socorro / UPA', icon: Activity },
  { id: 'Building', label: 'Complexo Médico', icon: Building },
  { id: 'Briefcase', label: 'Consultório Técnico', icon: Briefcase },
  { id: 'Factory', label: 'Indústria / Gases Medicinais', icon: Factory },
  { id: 'Store', label: 'Farmácia / Distribuidora', icon: Store },
]

export function getIconComponent(iconName?: string) {
  const found = ICON_OPTIONS.find((item) => item.id === iconName)
  return found ? found.icon : Building2
}

export default function TiposEmpreendimentoPage() {
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  // Data states
  const [tipos, setTipos] = useState<TipoEmpreendimento[]>([])
  const [categorias, setCategorias] = useState<CategoriaVistoria[]>([])
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Search
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

  // Dialogs: Itens de Fiscalização
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaVistoria | null>(null)
  const [categoriaForm, setCategoriaForm] = useState<CategoriaVistoriaFormData>({
    nome: '',
    exigeArt: true,
    periodicidadeDias: null,
  })
  const [categoriaToDelete, setCategoriaToDelete] = useState<CategoriaVistoria | null>(null)

  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    document.title = 'Tipos de Empreendimento · CREA-PI Fiscalização'
  }, [])

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [tiposList, catList, hospList] = await Promise.all([
        tiposEmpreendimentoService.getAll(),
        categoriasVistoriaService.getAll(),
        hospitaisService.getAll(),
      ])
      setTipos(tiposList)
      setCategorias(catList)
      setHospitais(hospList)
    } catch (err) {
      console.error('Erro ao carregar tipos de empreendimento e categorias:', err)
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
      const t = h.tipo || 'Hospital'
      map.set(t, (map.get(t) || 0) + 1)
    })
    return map
  }, [hospitais])

  // Filtered Tipos
  const filteredTipos = useMemo(() => {
    if (!searchQuery.trim()) return tipos
    const q = searchQuery.toLowerCase()
    return tipos.filter(
      (t) =>
        t.nome.toLowerCase().includes(q) || (t.descricao && t.descricao.toLowerCase().includes(q)),
    )
  }, [tipos, searchQuery])

  // Handlers for Tipo Empreendimento
  const handleOpenCreateTipo = () => {
    setEditingTipo(null)
    setTipoForm({ nome: '', icone: 'Building2', descricao: '' })
    setIsTipoModalOpen(true)
  }

  const handleOpenEditTipo = (t: TipoEmpreendimento) => {
    setEditingTipo(t)
    setTipoForm({
      nome: t.nome,
      icone: t.icone || 'Building2',
      descricao: t.descricao || '',
    })
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
          description: `O tipo "${created.nome}" foi cadastrado.`,
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
    try {
      setIsSaving(true)
      await tiposEmpreendimentoService.delete(tipoToDelete.id)
      setTipos((prev) => prev.filter((item) => item.id !== tipoToDelete.id))
      toast({
        title: 'Tipo excluído',
        description: `O tipo "${tipoToDelete.nome}" foi removido.`,
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

  // Handlers for Categorias / Itens de Fiscalização
  const handleOpenCreateCategoria = () => {
    setEditingCategoria(null)
    setCategoriaForm({ nome: '', exigeArt: true, periodicidadeDias: null })
    setIsCategoriaModalOpen(true)
  }

  const handleOpenEditCategoria = (c: CategoriaVistoria) => {
    setEditingCategoria(c)
    setCategoriaForm({
      nome: c.nome,
      exigeArt: c.exigeArt,
      periodicidadeDias: c.periodicidadeDias || null,
    })
    setIsCategoriaModalOpen(true)
  }

  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoriaForm.nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe a descrição do item de vistoria.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSaving(true)
      if (editingCategoria) {
        const updated = await categoriasVistoriaService.update(editingCategoria.id, categoriaForm)
        setCategorias((prev) =>
          prev.map((item) => (item.id === editingCategoria.id ? updated : item)),
        )
        toast({
          title: 'Item de fiscalização atualizado!',
          description: `O item "${updated.nome}" foi atualizado e refletirá no checklist de vistoria.`,
        })
      } else {
        const created = await categoriasVistoriaService.create(categoriaForm)
        setCategorias((prev) => [...prev, created])
        toast({
          title: 'Item criado com sucesso!',
          description: `"${created.nome}" agora faz parte do checklist de fiscalização.`,
        })
      }
      setIsCategoriaModalOpen(false)
    } catch (err) {
      console.error('Erro ao salvar categoria:', err)
      toast({
        title: 'Erro ao salvar item',
        description: 'Não foi possível atualizar o item de fiscalização.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCategoria = async () => {
    if (!categoriaToDelete) return
    try {
      setIsSaving(true)
      await categoriasVistoriaService.delete(categoriaToDelete.id)
      setCategorias((prev) => prev.filter((item) => item.id !== categoriaToDelete.id))
      toast({
        title: 'Item removido',
        description: `O item "${categoriaToDelete.nome}" foi excluído.`,
      })
      setCategoriaToDelete(null)
    } catch (err) {
      console.error('Erro ao excluir categoria:', err)
      toast({
        title: 'Erro ao remover item',
        description: 'Não foi possível remover o item de fiscalização.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="animate-page-enter space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-[28px] font-bold text-[#102A43] tracking-tight leading-tight">
            Tipos de Empreendimento & Fiscalização
          </h1>
          <p className="text-sm text-[#486581] mt-0.5">
            Estrutura de empreendimentos fiscalizados pelo CREA-PI e configuração dos itens do
            checklist
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <Button
            onClick={handleOpenCreateTipo}
            className="bg-[#004B8D] hover:bg-[#003666] text-white shadow-sm font-semibold h-10 px-4 cursor-pointer gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Novo Tipo de Empreendimento
          </Button>

          {isAdmin && (
            <Button
              onClick={handleOpenCreateCategoria}
              variant="outline"
              className="border-[#004B8D]/30 text-[#004B8D] hover:bg-[#E8F1F8] font-semibold h-10 px-3.5 gap-2"
            >
              <FileCheck2 className="w-4 h-4 text-[#004B8D]" />
              Novo Item de Vistoria
            </Button>
          )}
        </div>
      </div>

      {/* SECTION 1: GRADE VISUAL DE TIPOS DE EMPREENDIMENTO */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-stretch sm:items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E8F1F8] flex items-center justify-center text-[#004B8D]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#102A43]">
                Catálogo de Empreendimentos Regulados
              </h2>
              <p className="text-xs text-[#486581]">
                {tipos.length} tipos cadastrados no sistema CREA-PI
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
          <div className="py-16 text-center text-[#486581]">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#004B8D] mb-2" />
            <p className="text-xs font-semibold">Carregando catálogo de empreendimentos...</p>
          </div>
        ) : filteredTipos.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#D3DFE9] p-8 text-center">
            <Building2 className="w-8 h-8 text-[#829AB1] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#102A43]">
              Nenhum tipo de empreendimento encontrado
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs border-[#D3DFE9] text-[#004B8D]"
            >
              Limpar busca
            </Button>
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredTipos.map((tipo) => {
              const IconComp = getIconComponent(tipo.icone)
              const count = countPerTipo.get(tipo.nome) || 0
              const isStandardHospital = tipo.nome.toLowerCase() === 'hospital'

              return (
                <div
                  key={tipo.id}
                  className="bg-white rounded-2xl border border-[#D3DFE9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E8F1F8] to-blue-100/60 text-[#004B8D] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        <IconComp className="w-6 h-6 stroke-[2]" />
                      </div>

                      <div className="flex items-center gap-1 opacity-90">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEditTipo(tipo)}
                          className="h-8 w-8 p-0 text-[#004B8D] hover:bg-[#E8F1F8]"
                          title="Editar tipo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setTipoToDelete(tipo)}
                          className="h-8 w-8 p-0 text-[#829AB1] hover:text-rose-600 hover:bg-rose-50"
                          title="Excluir tipo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-[#102A43] leading-tight">
                          {tipo.nome}
                        </h3>
                        {isStandardHospital && (
                          <Badge className="bg-[#E5A812] text-[#102A43] hover:bg-[#E5A812] text-[10px] font-bold px-1.5 py-0">
                            Padrão
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#486581] mt-1.5 line-clamp-2 leading-relaxed">
                        {tipo.descricao ||
                          'Empreendimento regulamentado pela fiscalização técnica do CREA-PI.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#D3DFE9]/70 flex items-center justify-between text-xs text-[#486581]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <strong>{count}</strong>{' '}
                      {count === 1 ? 'unidade cadastrada' : 'unidades cadastradas'}
                    </span>
                    <span className="text-[11px] text-[#829AB1] font-mono">
                      {tipo.icone || 'Building2'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: ITENS / CATEGORIAS DE FISCALIZAÇÃO EDITÁVEIS */}
      <div className="bg-white rounded-2xl border border-[#D3DFE9] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D3DFE9] pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#004B8D]" />
              <h2 className="text-lg font-bold text-[#102A43]">
                Itens & Categorias do Checklist de Vistoria
              </h2>
            </div>
            <p className="text-xs text-[#486581]">
              Os itens abaixo definem o checklist técnico exibido na aba &ldquo;Vistoria&rdquo;.
              {isAdmin
                ? ' Como administrador, você pode alterar o nome, exigência de ART e periodicidade.'
                : ' Visualização dos itens técnicos padronizados pelo CREA-PI.'}
            </p>
          </div>

          {isAdmin && (
            <Button
              size="sm"
              onClick={handleOpenCreateCategoria}
              className="bg-[#004B8D] hover:bg-[#003666] text-white font-semibold text-xs h-9 px-3.5 gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Item ao Checklist
            </Button>
          )}
        </div>

        {/* Categories Table / List */}
        <div className="divide-y divide-[#D3DFE9]/80 border border-[#D3DFE9] rounded-xl overflow-hidden">
          {categorias.map((cat, idx) => (
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
                        <strong className="text-[#102A43]">{cat.periodicidadeDias} dias</strong>
                      ) : (
                        <span className="text-[#829AB1] italic">Sem periodicidade fixa</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons for admin */}
              {isAdmin && (
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEditCategoria(cat)}
                    className="h-8 px-2.5 text-xs border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8] font-semibold gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCategoriaToDelete(cat)}
                    className="h-8 w-8 p-0 text-[#829AB1] hover:text-rose-600 hover:bg-rose-50"
                    title="Excluir item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL 1: TIPO DE EMPREENDIMENTO */}
      <Dialog open={isTipoModalOpen} onOpenChange={setIsTipoModalOpen}>
        <DialogContent className="max-w-md bg-white border-[#D3DFE9]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#102A43]">
              {editingTipo ? 'Editar Tipo de Empreendimento' : 'Novo Tipo de Empreendimento'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#486581]">
              Cadastre ou atualize a categoria de empreendimento fiscalizado pelo CREA-PI.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTipo} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="tipo-nome" className="text-xs font-bold text-[#102A43]">
                Nome do Tipo de Empreendimento <span className="text-rose-600">*</span>
              </Label>
              <Input
                id="tipo-nome"
                placeholder="Ex: Clínica Odontológica, Laboratório..."
                value={tipoForm.nome}
                onChange={(e) => setTipoForm({ ...tipoForm, nome: e.target.value })}
                className="border-[#D3DFE9] focus-visible:ring-[#004B8D] text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tipo-icone" className="text-xs font-bold text-[#102A43]">
                Ícone Representativo
              </Label>
              <Select
                value={tipoForm.icone || 'Building2'}
                onValueChange={(val) => setTipoForm({ ...tipoForm, icone: val })}
              >
                <SelectTrigger id="tipo-icone" className="border-[#D3DFE9] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((opt) => {
                    const OptIcon = opt.icon
                    return (
                      <SelectItem key={opt.id} value={opt.id}>
                        <div className="flex items-center gap-2">
                          <OptIcon className="w-4 h-4 text-[#004B8D]" />
                          <span>{opt.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tipo-desc" className="text-xs font-bold text-[#102A43]">
                Descrição / Escopo
              </Label>
              <Textarea
                id="tipo-desc"
                rows={3}
                placeholder="Ex: Estabelecimentos de saúde destinados a consultas e procedimentos..."
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
                className="border-[#D3DFE9] text-[#486581]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#004B8D] hover:bg-[#003666] text-white font-bold"
              >
                {isSaving ? 'Salvando...' : editingTipo ? 'Salvar Alterações' : 'Cadastrar Tipo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ITEM / CATEGORIA DE VISTORIA */}
      <Dialog open={isCategoriaModalOpen} onOpenChange={setIsCategoriaModalOpen}>
        <DialogContent className="max-w-md bg-white border-[#D3DFE9]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#102A43]">
              {editingCategoria ? 'Editar Item de Fiscalização' : 'Novo Item de Fiscalização'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#486581]">
              Configure os parâmetros técnicos do item para o checklist de vistoria.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCategoria} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat-nome" className="text-xs font-bold text-[#102A43]">
                Nome da Categoria / Instalação <span className="text-rose-600">*</span>
              </Label>
              <Input
                id="cat-nome"
                placeholder="Ex: Ar-condicionado e exaustão, Caldeiras..."
                value={categoriaForm.nome}
                onChange={(e) => setCategoriaForm({ ...categoriaForm, nome: e.target.value })}
                className="border-[#D3DFE9] focus-visible:ring-[#004B8D] text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-art" className="text-xs font-bold text-[#102A43]">
                Exige ART (Anotação de Responsabilidade Técnica)?
              </Label>
              <Select
                value={categoriaForm.exigeArt ? 'sim' : 'nao'}
                onValueChange={(val) =>
                  setCategoriaForm({ ...categoriaForm, exigeArt: val === 'sim' })
                }
              >
                <SelectTrigger id="cat-art" className="border-[#D3DFE9] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim (Requer ART CREA)</SelectItem>
                  <SelectItem value="nao">Não (Dispensado)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cat-per" className="text-xs font-bold text-[#102A43]">
                  Periodicidade Regulatória em Dias
                </Label>
                <span className="text-[11px] text-[#627D98]">
                  Deixe vazio se não houver prazo fixo
                </span>
              </div>
              <Input
                id="cat-per"
                type="number"
                min={0}
                placeholder="Ex: 365 (1 ano) ou vazio para sem periodicidade fixa"
                value={categoriaForm.periodicidadeDias ?? ''}
                onChange={(e) => {
                  const v = e.target.value ? parseInt(e.target.value, 10) : null
                  setCategoriaForm({ ...categoriaForm, periodicidadeDias: v })
                }}
                className="border-[#D3DFE9] focus-visible:ring-[#004B8D] text-sm"
              />
              <p className="text-[11px] text-[#627D98]">
                Se preenchido, inspeções com data anterior a esse período serão calculadas como
                <strong> Vencidas</strong> no checklist.
              </p>
            </div>

            <DialogFooter className="pt-3 border-t border-[#D3DFE9]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCategoriaModalOpen(false)}
                className="border-[#D3DFE9] text-[#486581]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#004B8D] hover:bg-[#003666] text-white font-bold"
              >
                {isSaving ? 'Salvando...' : editingCategoria ? 'Salvar Alterações' : 'Salvar Item'}
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
            <AlertDialogCancel className="border-[#D3DFE9] text-[#486581]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTipo}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              Excluir Tipo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRM DELETE CATEGORIA */}
      <AlertDialog
        open={!!categoriaToDelete}
        onOpenChange={(open) => !open && setCategoriaToDelete(null)}
      >
        <AlertDialogContent className="border-[#D3DFE9] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#102A43]">
              Excluir Item de Fiscalização
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#486581]">
              Tem certeza que deseja excluir &ldquo;{categoriaToDelete?.nome}&rdquo; do checklist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#D3DFE9] text-[#486581]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategoria}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              Excluir Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
