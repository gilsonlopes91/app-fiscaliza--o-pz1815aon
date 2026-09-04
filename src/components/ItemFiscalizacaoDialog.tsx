import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle2,
  XCircle,
  Plus,
  Loader2,
  FolderTree,
  FileText,
  AlertCircle,
} from 'lucide-react'
import {
  ItemFiscalizacao,
  ItemFiscalizacaoFormData,
  ItemFiscalizacaoStatus,
} from '@/services/itensFiscalizacao'

interface ItemFiscalizacaoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hospitalId: string
  existingCategories: string[]
  itemToEdit: ItemFiscalizacao | null
  onSave: (data: ItemFiscalizacaoFormData, id?: string) => Promise<void>
}

const NEW_CATEGORY_VALUE = '__nova_categoria__'

export function ItemFiscalizacaoDialog({
  open,
  onOpenChange,
  hospitalId,
  existingCategories,
  itemToEdit,
  onSave,
}: ItemFiscalizacaoDialogProps) {
  const [selectedCategoryOption, setSelectedCategoryOption] = useState<string>('')
  const [newCategoryName, setNewCategoryName] = useState<string>('')
  const [nome, setNome] = useState<string>('')
  const [descricao, setDescricao] = useState<string>('')
  const [status, setStatus] = useState<ItemFiscalizacaoStatus>('Conforme')
  const [observacao, setObservacao] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      if (itemToEdit) {
        setNome(itemToEdit.nome || '')
        setDescricao(itemToEdit.descricao || '')
        setStatus(itemToEdit.status || 'Conforme')
        setObservacao(itemToEdit.observacao || '')

        if (existingCategories.includes(itemToEdit.categoria)) {
          setSelectedCategoryOption(itemToEdit.categoria)
          setNewCategoryName('')
        } else if (itemToEdit.categoria) {
          setSelectedCategoryOption(NEW_CATEGORY_VALUE)
          setNewCategoryName(itemToEdit.categoria)
        } else {
          setSelectedCategoryOption(existingCategories[0] || NEW_CATEGORY_VALUE)
          setNewCategoryName('')
        }
      } else {
        setNome('')
        setDescricao('')
        setStatus('Conforme')
        setObservacao('')
        if (existingCategories.length > 0) {
          setSelectedCategoryOption(existingCategories[0])
          setNewCategoryName('')
        } else {
          setSelectedCategoryOption(NEW_CATEGORY_VALUE)
          setNewCategoryName('')
        }
      }
      setErrors({})
    }
  }, [open, itemToEdit, existingCategories])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!nome.trim()) {
      newErrors.nome = 'O nome do item é obrigatório.'
    }

    const resolvedCategory =
      selectedCategoryOption === NEW_CATEGORY_VALUE
        ? newCategoryName.trim()
        : selectedCategoryOption.trim()

    if (!resolvedCategory) {
      newErrors.categoria = 'A categoria do item é obrigatória.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const resolvedCategory =
      selectedCategoryOption === NEW_CATEGORY_VALUE
        ? newCategoryName.trim()
        : selectedCategoryOption.trim()

    try {
      setIsSubmitting(true)
      await onSave(
        {
          hospital: hospitalId,
          nome: nome.trim(),
          categoria: resolvedCategory,
          descricao: descricao.trim(),
          status,
          observacao: observacao.trim(),
        },
        itemToEdit?.id,
      )
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg bg-white border-[#D3DFE9] text-[#102A43] max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E8F1F8] flex items-center justify-center text-[#004B8D]">
              <FolderTree className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg font-bold text-[#102A43]">
              {itemToEdit ? 'Editar Item de Fiscalização' : 'Novo Item de Fiscalização'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[#486581]">
            Preencha os dados do item de fiscalização específico deste empreendimento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Categoria */}
          <div className="space-y-2 bg-[#F4F6F9] p-3.5 rounded-xl border border-[#D3DFE9]">
            <Label className="text-xs font-bold uppercase tracking-wider text-[#004B8D] flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-[#004B8D]" />
              Categoria / Agrupamento <span className="text-red-500">*</span>
            </Label>

            {existingCategories.length > 0 ? (
              <div className="space-y-2">
                <Select
                  value={selectedCategoryOption}
                  onValueChange={(val) => {
                    setSelectedCategoryOption(val)
                    if (errors.categoria) setErrors({ ...errors, categoria: '' })
                  }}
                >
                  <SelectTrigger className="border-[#D3DFE9] bg-white focus:ring-[#004B8D] text-sm">
                    <SelectValue placeholder="Selecione ou crie uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW_CATEGORY_VALUE} className="text-[#004B8D] font-semibold">
                      + Criar nova categoria...
                    </SelectItem>
                  </SelectContent>
                </Select>

                {selectedCategoryOption === NEW_CATEGORY_VALUE && (
                  <div className="pt-1">
                    <Input
                      placeholder="Nome da nova categoria (ex: Instalações Elétricas, Estrutura...)"
                      value={newCategoryName}
                      onChange={(e) => {
                        setNewCategoryName(e.target.value)
                        if (errors.categoria) setErrors({ ...errors, categoria: '' })
                      }}
                      className="border-[#D3DFE9] bg-white focus-visible:ring-[#004B8D] text-sm"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <Input
                  placeholder="Nome da categoria (ex: Estrutura, Instalações, Segurança...)"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value)
                    if (errors.categoria) setErrors({ ...errors, categoria: '' })
                  }}
                  className="border-[#D3DFE9] bg-white focus-visible:ring-[#004B8D] text-sm"
                />
                <p className="text-[11px] text-[#627D98]">
                  Este empreendimento ainda não tem categorias cadastradas. Digite a primeira.
                </p>
              </div>
            )}

            {errors.categoria && (
              <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.categoria}
              </p>
            )}
          </div>

          {/* Nome do Item */}
          <div className="space-y-1.5">
            <Label htmlFor="item-nome" className="text-sm font-semibold text-[#102A43]">
              Nome do Item <span className="text-red-500">*</span>
            </Label>
            <Input
              id="item-nome"
              placeholder="Ex: Subestação de Energia / Gerador de Emergência"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value)
                if (errors.nome) setErrors({ ...errors, nome: '' })
              }}
              className={`border-[#D3DFE9] focus-visible:ring-[#004B8D] ${
                errors.nome ? 'border-red-500 focus-visible:ring-red-500' : ''
              }`}
            />
            {errors.nome && (
              <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.nome}
              </p>
            )}
          </div>

          {/* Descrição (opcional) */}
          <div className="space-y-1.5">
            <Label
              htmlFor="item-descricao"
              className="text-sm font-semibold text-[#102A43] flex items-center justify-between"
            >
              <span>Descrição / Requisitos Técnicos</span>
              <span className="text-xs font-normal text-[#627D98]">(opcional)</span>
            </Label>
            <Textarea
              id="item-descricao"
              rows={2}
              placeholder="Detalhes ou critérios de fiscalização deste item..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="border-[#D3DFE9] focus-visible:ring-[#004B8D] resize-none text-sm"
            />
          </div>

          {/* Status: Conforme vs Não Conforme */}
          <div className="space-y-2 bg-[#F4F6F9] p-3.5 rounded-xl border border-[#D3DFE9]">
            <Label className="text-xs font-bold uppercase tracking-wider text-[#004B8D]">
              Status de Fiscalização <span className="text-red-500">*</span>
            </Label>

            <RadioGroup
              value={status}
              onValueChange={(val) => setStatus(val as ItemFiscalizacaoStatus)}
              className="grid grid-cols-2 gap-3"
            >
              <label
                htmlFor="status-conforme"
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  status === 'Conforme'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold'
                    : 'border-[#D3DFE9] bg-white text-[#486581] hover:bg-slate-50'
                }`}
              >
                <RadioGroupItem value="Conforme" id="status-conforme" />
                <div className="flex items-center gap-1.5 text-sm">
                  <CheckCircle2
                    className={`w-4 h-4 ${status === 'Conforme' ? 'text-emerald-600' : 'text-[#829AB1]'}`}
                  />
                  <span>Conforme</span>
                </div>
              </label>

              <label
                htmlFor="status-nao-conforme"
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  status === 'Não Conforme'
                    ? 'border-rose-500 bg-rose-50 text-rose-950 font-semibold'
                    : 'border-[#D3DFE9] bg-white text-[#486581] hover:bg-slate-50'
                }`}
              >
                <RadioGroupItem value="Não Conforme" id="status-nao-conforme" />
                <div className="flex items-center gap-1.5 text-sm">
                  <XCircle
                    className={`w-4 h-4 ${status === 'Não Conforme' ? 'text-rose-600' : 'text-[#829AB1]'}`}
                  />
                  <span>Não Conforme</span>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Observação (texto livre) */}
          <div className="space-y-1.5">
            <Label
              htmlFor="item-obs"
              className="text-sm font-semibold text-[#102A43] flex items-center justify-between"
            >
              <span>Observações da Fiscalização</span>
              <span className="text-xs font-normal text-[#627D98]">(opcional)</span>
            </Label>
            <Textarea
              id="item-obs"
              rows={2}
              placeholder="Anotações de campo, prazos concedidos, pendências observadas..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="border-[#D3DFE9] focus-visible:ring-[#004B8D] resize-none text-sm"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-[#D3DFE9] flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-[#D3DFE9] text-[#486581]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#004B8D] hover:bg-[#003666] text-white font-semibold cursor-pointer shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : itemToEdit ? (
                'Salvar Alterações'
              ) : (
                'Cadastrar Item'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
