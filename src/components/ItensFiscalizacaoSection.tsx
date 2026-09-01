import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FolderTree,
  Plus,
  FileSpreadsheet,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  HelpCircle,
  CheckCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  ItemFiscalizacao,
  ItemFiscalizacaoFormData,
  itensFiscalizacaoService,
} from '@/services/itensFiscalizacao'
import { ItemFiscalizacaoDialog } from './ItemFiscalizacaoDialog'
import { ItemFiscalizacaoImportModal } from './ItemFiscalizacaoImportModal'
import { useToast } from '@/hooks/use-toast'

interface ItensFiscalizacaoSectionProps {
  hospitalId: string
  hospitalNome: string
}

export function ItensFiscalizacaoSection({
  hospitalId,
  hospitalNome,
}: ItensFiscalizacaoSectionProps) {
  const { toast } = useToast()

  const [itens, setItens] = useState<ItemFiscalizacao[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('todos')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('todas')

  // Modals state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [itemToEdit, setItemToEdit] = useState<ItemFiscalizacao | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ItemFiscalizacao | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Collapsed categories state (default all open)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  const toggleCategoryCollapse = (catName: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }))
  }

  const loadItens = useCallback(async () => {
    if (!hospitalId) return
    try {
      setIsLoading(true)
      const data = await itensFiscalizacaoService.getByHospital(hospitalId)
      setItens(data)
    } catch (err) {
      console.error('Erro ao carregar itens de fiscalização:', err)
      toast({
        title: 'Erro ao carregar itens',
        description: 'Não foi possível carregar os itens de fiscalização deste empreendimento.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [hospitalId, toast])

  useEffect(() => {
    loadItens()
  }, [loadItens])

  // Get distinct list of existing categories for this hospital
  const existingCategories = useMemo(() => {
    const set = new Set<string>()
    itens.forEach((i) => {
      if (i.categoria?.trim()) set.add(i.categoria.trim())
    })
    return Array.from(set).sort()
  }, [itens])

  // Filtered itens
  const filteredItens = useMemo(() => {
    return itens.filter((item) => {
      const matchSearch =
        searchQuery === '' ||
        item.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.categoria.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.descricao && item.descricao.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.observacao && item.observacao.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchStatus = selectedStatusFilter === 'todos' || item.status === selectedStatusFilter

      const matchCategory =
        selectedCategoryFilter === 'todas' || item.categoria === selectedCategoryFilter

      return matchSearch && matchStatus && matchCategory
    })
  }, [itens, searchQuery, selectedStatusFilter, selectedCategoryFilter])

  // Group filtered items by category
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, ItemFiscalizacao[]> = {}
    filteredItens.forEach((item) => {
      const cat = item.categoria || 'Geral'
      if (!groups[cat]) {
        groups[cat] = []
      }
      groups[cat].push(item)
    })
    return groups
  }, [filteredItens])

  // Overall statistics
  const totalCount = itens.length
  const conformeCount = itens.filter((i) => i.status === 'Conforme').length
  const naoConformeCount = itens.filter((i) => i.status === 'Não Conforme').length

  const handleSaveItem = async (formData: ItemFiscalizacaoFormData, id?: string) => {
    try {
      if (id) {
        const updated = await itensFiscalizacaoService.update(id, formData)
        setItens((prev) => prev.map((i) => (i.id === id ? updated : i)))
        toast({
          title: 'Item atualizado',
          description: `"${updated.nome}" foi atualizado com sucesso.`,
        })
      } else {
        const created = await itensFiscalizacaoService.create(formData)
        setItens((prev) => [...prev, created])
        toast({
          title: 'Item cadastrado',
          description: `"${created.nome}" adicionado na categoria "${created.categoria}".`,
        })
      }
    } catch (err) {
      console.error('Erro ao salvar item:', err)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o item no banco de dados.',
        variant: 'destructive',
      })
      throw err
    }
  }

  const handleDeleteItem = async () => {
    if (!itemToDelete) return
    try {
      setIsDeleting(true)
      await itensFiscalizacaoService.delete(itemToDelete.id)
      setItens((prev) => prev.filter((i) => i.id !== itemToDelete.id))
      toast({
        title: 'Item excluído',
        description: `"${itemToDelete.nome}" foi removido da lista.`,
      })
      setItemToDelete(null)
    } catch (err) {
      console.error('Erro ao excluir item:', err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o item selecionado.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenCreateDialog = () => {
    setItemToEdit(null)
    setIsDialogOpen(true)
  }

  const handleOpenEditDialog = (item: ItemFiscalizacao) => {
    setItemToEdit(item)
    setIsDialogOpen(true)
  }

  return (
    <div className="bg-[#F4F6F9] rounded-xl p-5 border border-[#D3DFE9] space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D3DFE9] pb-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#004B8D] flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-[#004B8D]" />
              Itens de Fiscalização
            </h4>
            <Badge className="bg-[#E8F1F8] text-[#004B8D] border border-[#004B8D]/20 text-[11px] font-bold px-2 py-0.5">
              {totalCount} {totalCount === 1 ? 'item' : 'itens'}
            </Badge>
          </div>
          <p className="text-xs text-[#486581]">
            Lista de itens técnicos auditados individualmente para este empreendimento.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            variant="outline"
            className="border-[#D3DFE9] bg-white text-[#004B8D] hover:bg-[#E8F1F8] text-xs font-semibold h-8 px-2.5 cursor-pointer gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#004B8D]" />
            Importar CSV
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreateDialog}
            className="bg-[#004B8D] hover:bg-[#003666] text-white text-xs font-semibold h-8 px-3 cursor-pointer gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Item
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      {totalCount > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white p-2.5 rounded-lg border border-[#D3DFE9] flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-[#627D98] uppercase">
              Total de Itens
            </span>
            <span className="text-base font-bold text-[#102A43] mt-0.5">{totalCount}</span>
          </div>

          <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Conformes
            </span>
            <span className="text-base font-extrabold text-emerald-700 mt-0.5">
              {conformeCount}{' '}
              <span className="text-[11px] font-normal text-emerald-600">
                ({Math.round((conformeCount / totalCount) * 100)}%)
              </span>
            </span>
          </div>

          <div className="bg-rose-50/80 p-2.5 rounded-lg border border-rose-200 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase flex items-center gap-1">
              <XCircle className="w-3 h-3 text-rose-600" />
              Não Conformes
            </span>
            <span className="text-base font-extrabold text-rose-700 mt-0.5">
              {naoConformeCount}{' '}
              <span className="text-[11px] font-normal text-rose-600">
                ({Math.round((naoConformeCount / totalCount) * 100)}%)
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Filter / Search Bar */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#627D98] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              placeholder="Filtrar por nome, categoria ou observação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8 border-[#D3DFE9] bg-white focus-visible:ring-[#004B8D]"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Filter by Category */}
            {existingCategories.length > 1 && (
              <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                <SelectTrigger className="border-[#D3DFE9] bg-white text-xs h-8 w-36">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas categorias</SelectItem>
                  {existingCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Filter by Status */}
            <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
              <SelectTrigger className="border-[#D3DFE9] bg-white text-xs h-8 w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="Conforme">Conforme</SelectItem>
                <SelectItem value="Não Conforme">Não Conforme</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        <div className="py-10 text-center text-[#486581]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#004B8D] mb-2" />
          <p className="text-xs font-semibold">Carregando itens de fiscalização...</p>
        </div>
      ) : totalCount === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-dashed border-[#D3DFE9] p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#E8F1F8] flex items-center justify-center text-[#004B8D] mx-auto">
            <FolderTree className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h5 className="text-sm font-bold text-[#102A43]">
              Nenhum item de fiscalização cadastrado
            </h5>
            <p className="text-xs text-[#627D98] max-w-md mx-auto">
              Cada empreendimento possui sua própria lista independente de itens técnicos. Cadastre
              manualmente ou importe uma planilha CSV com as colunas (categoria, nome do item,
              descrição).
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleOpenCreateDialog}
              className="bg-[#004B8D] hover:bg-[#003666] text-white text-xs font-semibold h-8 px-3 gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Cadastrar 1º Item
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsImportModalOpen(true)}
              className="border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8] text-xs font-semibold h-8 px-3 gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Importar Lista via CSV
            </Button>
          </div>
        </div>
      ) : filteredItens.length === 0 ? (
        /* Filtered Empty State */
        <div className="bg-white rounded-xl border border-dashed border-[#D3DFE9] p-6 text-center space-y-2">
          <p className="text-xs font-semibold text-[#102A43]">
            Nenhum item corresponde aos filtros selecionados.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('')
              setSelectedStatusFilter('todos')
              setSelectedCategoryFilter('todas')
            }}
            className="border-[#D3DFE9] text-[#004B8D] text-xs h-7"
          >
            Limpar filtros
          </Button>
        </div>
      ) : (
        /* Grouped Items by Category */
        <div className="space-y-3 pt-1">
          {Object.entries(groupedByCategory).map(([categoryName, itemsInCategory]) => {
            const isCollapsed = collapsedCategories[categoryName]
            const categoryConformes = itemsInCategory.filter((i) => i.status === 'Conforme').length
            const categoryNaoConformes = itemsInCategory.filter(
              (i) => i.status === 'Não Conforme',
            ).length

            return (
              <div
                key={categoryName}
                className="bg-white rounded-xl border border-[#D3DFE9] overflow-hidden shadow-2xs"
              >
                {/* Category Header Bar */}
                <div
                  onClick={() => toggleCategoryCollapse(categoryName)}
                  className="bg-[#E8F1F8]/70 hover:bg-[#E8F1F8] px-4 py-2.5 border-b border-[#D3DFE9] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-[#004B8D] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#004B8D] shrink-0" />
                    )}
                    <span className="text-xs font-bold text-[#004B8D] tracking-wide uppercase flex items-center gap-1.5">
                      <FolderTree className="w-3.5 h-3.5" />
                      {categoryName}
                    </span>
                    <span className="text-[11px] font-semibold text-[#627D98]">
                      ({itemsInCategory.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {categoryNaoConformes > 0 ? (
                      <Badge className="bg-rose-50 text-rose-800 border-rose-300 text-[10px] font-semibold px-2 py-0">
                        {categoryNaoConformes} Não Conforme{categoryNaoConformes > 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-semibold px-2 py-0">
                        100% Conforme
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Items List inside Category */}
                {!isCollapsed && (
                  <div className="divide-y divide-[#E8F1F8]">
                    {itemsInCategory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                      >
                        <div className="space-y-1 flex-1 pr-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-[#102A43] leading-snug">
                              {item.nome}
                            </span>
                            <Badge
                              className={`text-[10px] font-bold px-2 py-0.5 border ${
                                item.status === 'Conforme'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-rose-50 text-rose-800 border-rose-300'
                              }`}
                            >
                              {item.status === 'Conforme' ? (
                                <span className="inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Conforme
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <XCircle className="w-3 h-3 text-rose-600" /> Não Conforme
                                </span>
                              )}
                            </Badge>
                          </div>

                          {item.descricao && (
                            <p className="text-xs text-[#486581] leading-relaxed">
                              {item.descricao}
                            </p>
                          )}

                          {item.observacao && (
                            <div className="bg-[#F4F6F9] border-l-2 border-[#004B8D] px-2.5 py-1.5 rounded-r text-[11px] text-[#334E68] mt-1.5">
                              <span className="font-semibold text-[#004B8D]">Observação: </span>
                              {item.observacao}
                            </div>
                          )}
                        </div>

                        {/* Action buttons (Edit / Delete) */}
                        <div className="flex items-center gap-1 self-end sm:self-start shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditDialog(item)}
                            className="h-7 w-7 p-0 text-[#004B8D] hover:bg-[#E8F1F8] rounded-md cursor-pointer"
                            title="Editar este item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setItemToDelete(item)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                            title="Excluir este item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Manual Create / Edit Item Dialog */}
      <ItemFiscalizacaoDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        hospitalId={hospitalId}
        existingCategories={existingCategories}
        itemToEdit={itemToEdit}
        onSave={handleSaveItem}
      />

      {/* CSV Import Modal (Upload file or Paste) */}
      <ItemFiscalizacaoImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        hospitalId={hospitalId}
        hospitalNome={hospitalNome}
        onImportSuccess={() => {
          loadItens()
        }}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => {
          if (!open) setItemToDelete(null)
        }}
      >
        <AlertDialogContent className="border-[#D3DFE9] bg-white text-[#102A43]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-[#102A43]">
              Excluir Item de Fiscalização
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#486581]">
              Tem certeza que deseja excluir &ldquo;{itemToDelete?.nome}&rdquo; da categoria &ldquo;
              {itemToDelete?.categoria}&rdquo;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="border-[#D3DFE9] text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
