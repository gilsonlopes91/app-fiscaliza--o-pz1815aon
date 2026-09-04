import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Building2,
  MapPin,
  User,
  ClipboardCheck,
  Loader2,
  X,
  AlertCircle,
  FileText,
  CreditCard,
  Building,
  Hash,
} from 'lucide-react'
import { Hospital, HospitalFormData, hospitaisService } from '@/services/hospitais'
import { TipoEmpreendimento, tiposEmpreendimentoService } from '@/services/tiposEmpreendimento'
import { formatCNPJ, formatCPF, formatCNES } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'

interface IniciarVistoriaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hospital: Hospital | null
  /**
   * Chamado quando os dados foram salvos com sucesso e a vistoria deve prosseguir.
   * Recebe o hospital atualizado para que o chamador possa sincronizar o estado e navegar.
   */
  onConfirmAndContinue: (updatedHospital: Hospital) => Promise<void>
}

export function IniciarVistoriaModal({
  open,
  onOpenChange,
  hospital,
  onConfirmAndContinue,
}: IniciarVistoriaModalProps) {
  const { toast } = useToast()
  const [tiposEmpreendimento, setTiposEmpreendimento] = useState<TipoEmpreendimento[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<HospitalFormData>({
    nome: '',
    municipio: '',
    cnes: '',
    cnpj: '',
    cnpj_mantenedora: '',
    tipo: 'Hospital',
    endereco: '',
    responsavel: '',
    cpf_responsavel: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Carregar catálogo de tipos de empreendimento
  useEffect(() => {
    tiposEmpreendimentoService
      .getAll()
      .then((data) => setTiposEmpreendimento(data))
      .catch((err) => console.error('Erro ao carregar tipos de empreendimento:', err))
  }, [])

  // Inicializar formulário sempre que o modal abrir ou o hospital mudar
  useEffect(() => {
    if (hospital && open) {
      // Limpa valores "Não informado" ou similares caso existam gravados
      const cleanResponsavel =
        hospital.responsavel && hospital.responsavel.trim().toLowerCase() !== 'não informado'
          ? hospital.responsavel
          : ''
      const cleanCpf =
        hospital.cpf_responsavel &&
        hospital.cpf_responsavel.trim().toLowerCase() !== 'não informado'
          ? formatCPF(hospital.cpf_responsavel)
          : ''

      setFormData({
        nome: hospital.nome || '',
        municipio: hospital.municipio || '',
        cnes: hospital.cnes || '',
        cnpj: hospital.cnpj ? formatCNPJ(hospital.cnpj) : '',
        cnpj_mantenedora: hospital.cnpj_mantenedora ? formatCNPJ(hospital.cnpj_mantenedora) : '',
        tipo: hospital.tipo || 'Hospital',
        endereco:
          hospital.endereco && hospital.endereco.trim().toLowerCase() !== 'não informado'
            ? hospital.endereco
            : '',
        responsavel: cleanResponsavel,
        cpf_responsavel: cleanCpf,
      })
      setErrors({})
    }
  }, [hospital, open])

  if (!hospital) return null

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    // 1. Dados do Estabelecimento
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome oficial é obrigatório.'
    }
    if (!formData.cnes.trim()) {
      newErrors.cnes = 'Código CNES é obrigatório.'
    } else {
      const cnesDigits = formData.cnes.replace(/\D/g, '')
      if (cnesDigits.length !== 7) {
        newErrors.cnes = 'CNES deve conter exatamente 7 dígitos.'
      }
    }
    if (formData.cnpj) {
      const cnpjDigits = formData.cnpj.replace(/\D/g, '')
      if (cnpjDigits.length > 0 && cnpjDigits.length !== 14) {
        newErrors.cnpj = 'CNPJ deve conter 14 dígitos.'
      }
    }
    if (formData.cnpj_mantenedora) {
      const mantDigits = formData.cnpj_mantenedora.replace(/\D/g, '')
      if (mantDigits.length > 0 && mantDigits.length !== 14) {
        newErrors.cnpj_mantenedora = 'CNPJ da mantenedora deve conter 14 dígitos.'
      }
    }

    // 2. Localização e Município
    if (!formData.municipio.trim()) {
      newErrors.municipio = 'Município/UF é obrigatório.'
    }

    // 3. Responsável pelas Informações (opcional; validação apenas de formato quando preenchido)
    const cpfClean = (formData.cpf_responsavel || '').trim()
    const cpfDigits = cpfClean.replace(/\D/g, '')
    if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
      newErrors.cpf_responsavel = 'CPF do Responsável deve conter 11 dígitos.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      toast({
        title: 'Dados pendentes',
        description: 'Corrija os campos obrigatórios antes de continuar para a vistoria.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)

      // 1. Salvar alterações no registro do empreendimento no PocketBase
      const updated = await hospitaisService.update(hospital.id, {
        nome: formData.nome.trim(),
        municipio: formData.municipio.trim(),
        cnes: formData.cnes.trim(),
        cnpj: formData.cnpj ? formData.cnpj.trim() : '',
        cnpj_mantenedora: formData.cnpj_mantenedora ? formData.cnpj_mantenedora.trim() : '',
        tipo: formData.tipo?.trim() || 'Hospital',
        endereco: formData.endereco ? formData.endereco.trim() : '',
        responsavel: formData.responsavel ? formData.responsavel.trim() : '',
        cpf_responsavel: formData.cpf_responsavel ? formData.cpf_responsavel.trim() : '',
      })

      // 2. Notificar e prosseguir para criar/abrir a vistoria e navegar
      await onConfirmAndContinue(updated)
      onOpenChange(false)
    } catch (err) {
      console.error('Erro ao atualizar dados antes da vistoria:', err)
      toast({
        title: 'Erro ao salvar dados',
        description:
          'Não foi possível salvar os dados do estabelecimento antes de iniciar a vistoria.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl bg-white border-[#D3DFE9] p-0 overflow-hidden rounded-2xl max-h-[92vh] flex flex-col">
        {/* Header no padrão visual CREA-PI */}
        <DialogHeader className="p-4 sm:p-6 pb-4 bg-[#004B8D] text-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-[#E5A812] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <ClipboardCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0 pr-6">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-lg sm:text-xl font-bold text-white text-left leading-tight">
                  Conferência do Estabelecimento
                </DialogTitle>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-[#E5A812] text-[#102A43] px-2 py-0.5 rounded">
                  Pré-Vistoria
                </span>
              </div>
              <DialogDescription className="text-xs text-blue-100 text-left mt-1 leading-relaxed">
                Confira e corrija os dados cadastrais antes de abrir o checklist da vistoria.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Formulário com scroll vertical para responsividade em celulares */}
        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 text-left"
        >
          {/* Aviso informativo de validação pré-vistoria */}
          <div className="bg-[#E8F1F8] border-l-4 border-[#004B8D] rounded-r-lg p-3 text-xs text-[#102A43] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#004B8D] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-[#004B8D]">Atenção, Fiscal:</p>
              <p className="text-[#334E68] leading-relaxed">
                Verifique os dados cadastrais da unidade. As alterações serão salvas imediatamente
                no cadastro do estabelecimento antes de seguir para o checklist.
              </p>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SEÇÃO 1: DADOS DO ESTABELECIMENTO                              */}
          {/* ============================================================== */}
          <div className="bg-[#F4F6F9] rounded-xl p-4 sm:p-5 border border-[#D3DFE9] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#004B8D] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#004B8D]" />
              Dados do Estabelecimento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Nome Oficial */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label
                  htmlFor="pv-nome"
                  className="text-xs font-bold text-[#102A43] flex items-center gap-1"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#004B8D]" />
                  Nome Oficial do Empreendimento <span className="text-rose-600">*</span>
                </Label>
                <Input
                  id="pv-nome"
                  value={formData.nome}
                  onChange={(e) => {
                    setFormData({ ...formData, nome: e.target.value })
                    if (errors.nome) setErrors({ ...errors, nome: '' })
                  }}
                  className={`bg-white border-[#D3DFE9] text-xs sm:text-sm focus-visible:ring-[#004B8D] ${
                    errors.nome ? 'border-rose-500 focus-visible:ring-rose-500' : ''
                  }`}
                  placeholder="Ex: Hospital Regional ou Fazenda Modelo..."
                />
                {errors.nome && (
                  <p className="text-[11px] font-medium text-rose-600">{errors.nome}</p>
                )}
              </div>

              {/* Tipo de Empreendimento */}
              <div className="space-y-1.5">
                <Label htmlFor="pv-tipo" className="text-xs font-bold text-[#102A43]">
                  Tipo de Empreendimento
                </Label>
                <Select
                  value={formData.tipo || 'Hospital'}
                  onValueChange={(val) => setFormData({ ...formData, tipo: val })}
                >
                  <SelectTrigger
                    id="pv-tipo"
                    className="bg-white border-[#D3DFE9] text-xs sm:text-sm focus:ring-[#004B8D]"
                  >
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposEmpreendimento.length > 0 ? (
                      tiposEmpreendimento.map((t) => (
                        <SelectItem key={t.id} value={t.nome}>
                          {t.nome}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="Hospital">Hospital</SelectItem>
                        <SelectItem value="Clínica Médica">Clínica Médica</SelectItem>
                        <SelectItem value="Laboratório de Análises">
                          Laboratório de Análises
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Código CNES */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="pv-cnes"
                  className="text-xs font-bold text-[#102A43] flex items-center gap-1"
                >
                  <Hash className="w-3.5 h-3.5 text-[#E5A812]" />
                  Código CNES (7 dígitos) <span className="text-rose-600">*</span>
                </Label>
                <Input
                  id="pv-cnes"
                  maxLength={7}
                  value={formData.cnes}
                  onChange={(e) => {
                    const formatted = formatCNES(e.target.value)
                    setFormData({ ...formData, cnes: formatted })
                    if (errors.cnes) setErrors({ ...errors, cnes: '' })
                  }}
                  className={`bg-white border-[#D3DFE9] font-mono text-xs sm:text-sm focus-visible:ring-[#004B8D] ${
                    errors.cnes ? 'border-rose-500 focus-visible:ring-rose-500' : ''
                  }`}
                  placeholder="0000000"
                />
                {errors.cnes && (
                  <p className="text-[11px] font-medium text-rose-600">{errors.cnes}</p>
                )}
              </div>

              {/* CNPJ */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="pv-cnpj"
                  className="text-xs font-bold text-[#102A43] flex items-center gap-1"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#004B8D]" />
                  CNPJ
                </Label>
                <Input
                  id="pv-cnpj"
                  maxLength={18}
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpj}
                  onChange={(e) => {
                    const formatted = formatCNPJ(e.target.value)
                    setFormData({ ...formData, cnpj: formatted })
                    if (errors.cnpj) setErrors({ ...errors, cnpj: '' })
                  }}
                  className={`bg-white border-[#D3DFE9] font-mono text-xs sm:text-sm focus-visible:ring-[#004B8D] ${
                    errors.cnpj ? 'border-rose-500 focus-visible:ring-rose-500' : ''
                  }`}
                />
                {errors.cnpj && (
                  <p className="text-[11px] font-medium text-rose-600">{errors.cnpj}</p>
                )}
              </div>

              {/* CNPJ da Mantenedora */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="pv-cnpj-mant"
                  className="text-xs font-bold text-[#102A43] flex items-center gap-1"
                >
                  <Building className="w-3.5 h-3.5 text-[#004B8D]" />
                  CNPJ da Mantenedora
                </Label>
                <Input
                  id="pv-cnpj-mant"
                  maxLength={18}
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpj_mantenedora}
                  onChange={(e) => {
                    const formatted = formatCNPJ(e.target.value)
                    setFormData({ ...formData, cnpj_mantenedora: formatted })
                    if (errors.cnpj_mantenedora) setErrors({ ...errors, cnpj_mantenedora: '' })
                  }}
                  className={`bg-white border-[#D3DFE9] font-mono text-xs sm:text-sm focus-visible:ring-[#004B8D] ${
                    errors.cnpj_mantenedora ? 'border-rose-500 focus-visible:ring-rose-500' : ''
                  }`}
                />
                {errors.cnpj_mantenedora && (
                  <p className="text-[11px] font-medium text-rose-600">{errors.cnpj_mantenedora}</p>
                )}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SEÇÃO 2: LOCALIZAÇÃO E MUNICÍPIO                               */}
          {/* ============================================================== */}
          <div className="bg-[#F4F6F9] rounded-xl p-4 sm:p-5 border border-[#D3DFE9] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#004B8D] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#004B8D]" />
              Localização e Município
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Município/UF */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="pv-municipio" className="text-xs font-bold text-[#102A43]">
                  Município / UF <span className="text-rose-600">*</span>
                </Label>
                <Input
                  id="pv-municipio"
                  value={formData.municipio}
                  onChange={(e) => {
                    setFormData({ ...formData, municipio: e.target.value })
                    if (errors.municipio) setErrors({ ...errors, municipio: '' })
                  }}
                  className={`bg-white border-[#D3DFE9] text-xs sm:text-sm focus-visible:ring-[#004B8D] ${
                    errors.municipio ? 'border-rose-500 focus-visible:ring-rose-500' : ''
                  }`}
                  placeholder="Ex: Teresina / PI"
                />
                {errors.municipio && (
                  <p className="text-[11px] font-medium text-rose-600">{errors.municipio}</p>
                )}
              </div>

              {/* Endereço Completo */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="pv-endereco" className="text-xs font-bold text-[#102A43]">
                  Endereço Completo
                </Label>
                <Textarea
                  id="pv-endereco"
                  rows={2}
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="bg-white border-[#D3DFE9] text-xs sm:text-sm focus-visible:ring-[#004B8D] resize-none"
                  placeholder="Rua/Avenida, número, bairro, ponto de referência..."
                />
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SEÇÃO 3: RESPONSÁVEL PELAS INFORMAÇÕES                         */}
          {/* ============================================================== */}
          <div className="bg-[#FFF9EE] rounded-xl p-4 sm:p-5 border border-[#E5A812]/50 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#975A16] flex items-center gap-2">
                <User className="w-4 h-4 text-[#D97706]" />
                Responsável pelas Informações
              </h3>
            </div>
            <p className="text-[11px] text-[#7C5010] leading-relaxed">
              O fiscal deve conferir ou preencher a pessoa responsável no local.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Nome do Responsável */}
              <div className="space-y-1.5">
                <Label htmlFor="pv-responsavel" className="text-xs font-bold text-[#102A43]">
                  Nome do Responsável
                </Label>
                <Input
                  id="pv-responsavel"
                  value={formData.responsavel}
                  onChange={(e) => {
                    setFormData({ ...formData, responsavel: e.target.value })
                    if (errors.responsavel) setErrors({ ...errors, responsavel: '' })
                  }}
                  className={`bg-white border-[#D3DFE9] text-xs sm:text-sm focus-visible:ring-[#004B8D] ${
                    errors.responsavel ? 'border-rose-500 focus-visible:ring-rose-500' : ''
                  }`}
                  placeholder="Nome completo do diretor/responsável"
                />
                {errors.responsavel && (
                  <p className="text-[11px] font-medium text-rose-600">{errors.responsavel}</p>
                )}
              </div>

              {/* CPF do Responsável */}
              <div className="space-y-1.5">
                <Label htmlFor="pv-cpf_responsavel" className="text-xs font-bold text-[#102A43]">
                  CPF do Responsável
                </Label>
                <Input
                  id="pv-cpf_responsavel"
                  maxLength={14}
                  placeholder="000.000.000-00"
                  value={formData.cpf_responsavel}
                  onChange={(e) => {
                    const formatted = formatCPF(e.target.value)
                    setFormData({ ...formData, cpf_responsavel: formatted })
                    if (errors.cpf_responsavel) setErrors({ ...errors, cpf_responsavel: '' })
                  }}
                  className={`bg-white border-[#D3DFE9] font-mono text-xs sm:text-sm focus-visible:ring-[#004B8D] ${
                    errors.cpf_responsavel ? 'border-rose-500 focus-visible:ring-rose-500' : ''
                  }`}
                />
                {errors.cpf_responsavel && (
                  <p className="text-[11px] font-medium text-rose-600">{errors.cpf_responsavel}</p>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Footer com botões de Cancelar e Salvar & Continuar */}
        <DialogFooter className="p-3.5 sm:px-6 bg-[#F4F6F9] border-t border-[#D3DFE9] flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="order-2 sm:order-1 border-[#D3DFE9] text-[#486581] hover:text-[#102A43] text-xs h-10 sm:h-9 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="order-1 sm:order-2 bg-[#004B8D] hover:bg-[#003666] text-white font-bold text-xs sm:text-sm h-10 sm:h-9 px-4 cursor-pointer shadow-sm gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Salvando dados...
              </>
            ) : (
              <>
                <ClipboardCheck className="w-4 h-4 mr-1 stroke-[2.2] shrink-0" />
                <span className="truncate">Salvar e Ir para o Checklist</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
