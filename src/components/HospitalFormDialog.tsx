import React, { useState, useEffect, useId } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Building2, Save, X, Loader2 } from 'lucide-react'
import { Hospital, HospitalFormData } from '@/services/hospitais'
import { tiposEmpreendimentoService, TipoEmpreendimento } from '@/services/tiposEmpreendimento'
import {
  formatCNPJ,
  formatCPF,
  formatCNES,
  formatCEP,
  formatTelefone,
  formatAnoSafra,
} from '@/lib/formatters'
import { isTipoSaude, isTipoRural, tipoLabel, exemploNomePorTipo } from '@/lib/tipoEmpreendimento'
import { resolverMunicipio } from '@/lib/municipiosPiaui'
import { CoordenadasField } from '@/components/CoordenadasField'
import { MunicipioCombobox } from '@/components/MunicipioCombobox'

interface HospitalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hospitalToEdit?: Hospital | null
  onSave: (data: HospitalFormData) => Promise<void>
  /** Tipo já selecionado na tela de origem (ex.: Fazenda), usado como padrão. */
  tipoPadrao?: string
}

export function HospitalFormDialog({
  open,
  onOpenChange,
  hospitalToEdit,
  onSave,
  tipoPadrao,
}: HospitalFormDialogProps) {
  const isEditing = !!hospitalToEdit

  const [tiposEmpreendimento, setTiposEmpreendimento] = useState<TipoEmpreendimento[]>([])

  const [formData, setFormData] = useState<HospitalFormData>({
    nome: '',
    municipio: '',
    cnes: '',
    cnpj: '',
    cnpj_mantenedora: '',
    inscricao_estadual: '',
    cpf: '',
    ano_safra: '',
    tipo: tipoPadrao || 'Hospital',
    endereco: '',
    cep: '',
    latitude: '',
    longitude: '',
    email: '',
    telefone: '',
    responsavel: '',
    cargo_responsavel: '',
    cpf_responsavel: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load registered tipos de empreendimento dynamically
  useEffect(() => {
    tiposEmpreendimentoService
      .getAll()
      .then((data) => setTiposEmpreendimento(data))
      .catch((err) => console.error('Erro ao carregar tipos no formulário:', err))
  }, [])

  // Sync form data when dialog opens or editing changes
  useEffect(() => {
    if (open) {
      if (hospitalToEdit) {
        setFormData({
          nome: hospitalToEdit.nome || '',
          municipio: hospitalToEdit.municipio || '',
          cnes: hospitalToEdit.cnes || '',
          cnpj: hospitalToEdit.cnpj ? formatCNPJ(hospitalToEdit.cnpj) : '',
          cnpj_mantenedora: hospitalToEdit.cnpj_mantenedora
            ? formatCNPJ(hospitalToEdit.cnpj_mantenedora)
            : '',
          inscricao_estadual: hospitalToEdit.inscricao_estadual || '',
          cpf: hospitalToEdit.cpf ? formatCPF(hospitalToEdit.cpf) : '',
          ano_safra: hospitalToEdit.ano_safra || '',
          tipo: hospitalToEdit.tipo || tipoPadrao || 'Hospital',
          endereco: hospitalToEdit.endereco || '',
          cep: hospitalToEdit.cep ? formatCEP(hospitalToEdit.cep) : '',
          latitude: hospitalToEdit.latitude || '',
          longitude: hospitalToEdit.longitude || '',
          email: hospitalToEdit.email || '',
          telefone: hospitalToEdit.telefone ? formatTelefone(hospitalToEdit.telefone) : '',
          responsavel: hospitalToEdit.responsavel || '',
          cargo_responsavel: hospitalToEdit.cargo_responsavel || '',
          cpf_responsavel: hospitalToEdit.cpf_responsavel
            ? formatCPF(hospitalToEdit.cpf_responsavel)
            : '',
        })
      } else {
        setFormData({
          nome: '',
          municipio: '',
          cnes: '',
          cnpj: '',
          cnpj_mantenedora: '',
          inscricao_estadual: '',
          cpf: '',
          ano_safra: '',
          tipo: tipoPadrao || 'Hospital',
          endereco: '',
          cep: '',
          latitude: '',
          longitude: '',
          email: '',
          telefone: '',
          responsavel: '',
          cargo_responsavel: '',
          cpf_responsavel: '',
        })
      }
      setErrors({})
      setIsSubmitting(false)
    }
  }, [open, hospitalToEdit, tipoPadrao])

  const rotulo = tipoLabel(formData.tipo || tipoPadrao)
  const exigeCnes = isTipoSaude(formData.tipo || tipoPadrao)
  const isRural = isTipoRural(formData.tipo || tipoPadrao)

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.nome.trim()) {
      newErrors.nome = 'O nome do empreendimento é obrigatório.'
    }
    if (!formData.municipio.trim()) {
      newErrors.municipio = 'Município é obrigatório.'
    } else if (!resolverMunicipio(formData.municipio)) {
      newErrors.municipio = 'Selecione um dos 224 municípios do Piauí na lista.'
    }
    if (exigeCnes) {
      if (!formData.cnes.trim()) {
        newErrors.cnes = 'CNES é obrigatório para estabelecimentos de saúde.'
      } else if (formData.cnes.replace(/\D/g, '').length !== 7) {
        newErrors.cnes = 'CNES deve conter exatamente 7 dígitos.'
      }
    }

    if (formData.cnpj) {
      const cnpjDigits = formData.cnpj.replace(/\D/g, '')
      if (cnpjDigits.length > 0 && cnpjDigits.length !== 14) {
        newErrors.cnpj = 'CNPJ inválido (deve conter 14 dígitos).'
      }
    }

    if (formData.cnpj_mantenedora) {
      const mantDigits = formData.cnpj_mantenedora.replace(/\D/g, '')
      if (mantDigits.length > 0 && mantDigits.length !== 14) {
        newErrors.cnpj_mantenedora = 'CNPJ da mantenedora inválido (14 dígitos).'
      }
    }

    if (formData.cpf_responsavel) {
      const cpfDigits = formData.cpf_responsavel.replace(/\D/g, '')
      if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
        newErrors.cpf_responsavel = 'CPF inválido (deve conter 11 dígitos).'
      }
    }

    if (formData.cpf) {
      const produtorDigits = formData.cpf.replace(/\D/g, '')
      if (produtorDigits.length > 0 && produtorDigits.length !== 11) {
        newErrors.cpf = 'CPF inválido (deve conter 11 dígitos).'
      }
    }

    if (formData.cep) {
      const cepDigits = formData.cep.replace(/\D/g, '')
      if (cepDigits.length > 0 && cepDigits.length !== 8) {
        newErrors.cep = 'CEP inválido (deve conter 8 dígitos).'
      }
    }

    if (formData.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email.trim())) {
      newErrors.email = 'E-mail inválido.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      setIsSubmitting(true)
      // Garante a grafia oficial do município antes de gravar
      await onSave({
        ...formData,
        municipio: resolverMunicipio(formData.municipio) || formData.municipio.trim(),
      })
      onOpenChange(false)
    } catch {
      // Error handled by parent or toast
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto p-0 border-[#D3DFE9] bg-white rounded-2xl">
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-[#D3DFE9] bg-[#F4F6F9]">
          {' '}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8F1F8] flex items-center justify-center text-[#004B8D] shrink-0 shadow-xs">
              <Building2 className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#102A43]">
                {isEditing ? `Editar cadastro — ${rotulo}` : `Novo cadastro — ${rotulo}`}
              </DialogTitle>
              <DialogDescription className="text-sm text-[#486581] mt-0.5">
                {isEditing
                  ? `Atualize os dados cadastrais deste empreendimento (${rotulo}) no CREA-PI.`
                  : `Preencha os campos para cadastrar um empreendimento do tipo ${rotulo} para fiscalização técnica.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Dados Principais */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#004B8D] mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E5A812]" />
              Identificação Geral
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="nome" className="text-sm font-semibold text-[#102A43]">
                  Nome do Empreendimento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nome"
                  placeholder={exemploNomePorTipo(formData.tipo || tipoPadrao)}
                  value={formData.nome}
                  onChange={(e) => {
                    setFormData({ ...formData, nome: e.target.value })
                    if (errors.nome) setErrors({ ...errors, nome: '' })
                  }}
                  className={`border-[#D3DFE9] focus-visible:ring-[#004B8D] ${
                    errors.nome ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                />
                {errors.nome && (
                  <p className="text-xs font-medium text-red-500 mt-1">{errors.nome}</p>
                )}
              </div>

              <MunicipioCombobox
                id="municipio"
                value={formData.municipio}
                error={errors.municipio}
                onChange={(municipio) => {
                  setFormData((prev) => ({ ...prev, municipio }))
                  if (errors.municipio) setErrors((prev) => ({ ...prev, municipio: '' }))
                }}
              />

              {exigeCnes && (
                <div className="space-y-1.5">
                  <Label htmlFor="cnes" className="text-sm font-semibold text-[#102A43]">
                    CNES (7 dígitos) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cnes"
                    placeholder="Ex: 1234567"
                    maxLength={7}
                    value={formData.cnes}
                    onChange={(e) => {
                      const val = formatCNES(e.target.value)
                      setFormData({ ...formData, cnes: val })
                      if (errors.cnes) setErrors({ ...errors, cnes: '' })
                    }}
                    className={`border-[#D3DFE9] focus-visible:ring-[#004B8D] ${
                      errors.cnes ? 'border-red-500 focus-visible:ring-red-500' : ''
                    }`}
                  />
                  {errors.cnes && (
                    <p className="text-xs font-medium text-red-500 mt-1">{errors.cnes}</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="tipo" className="text-sm font-semibold text-[#102A43]">
                  Tipo de Empreendimento
                </Label>
                <Select
                  value={formData.tipo || 'Hospital'}
                  onValueChange={(val) =>
                    setFormData({
                      ...formData,
                      tipo: val,
                    })
                  }
                >
                  <SelectTrigger
                    id="tipo"
                    className="border-[#D3DFE9] focus:ring-[#004B8D] bg-white"
                  >
                    <SelectValue placeholder="Selecione o tipo de empreendimento" />
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

              <div className="space-y-1.5">
                <Label htmlFor="cnpj" className="text-sm font-semibold text-[#102A43]">
                  CNPJ
                </Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  value={formData.cnpj}
                  onChange={(e) => {
                    const formatted = formatCNPJ(e.target.value)
                    setFormData({ ...formData, cnpj: formatted })
                    if (errors.cnpj) setErrors({ ...errors, cnpj: '' })
                  }}
                  className={`border-[#D3DFE9] focus-visible:ring-[#004B8D] ${
                    errors.cnpj ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                />
                {errors.cnpj && (
                  <p className="text-xs font-medium text-red-500 mt-1">{errors.cnpj}</p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cnpj_mantenedora" className="text-sm font-semibold text-[#102A43]">
                  CNPJ da Mantenedora
                </Label>
                <Input
                  id="cnpj_mantenedora"
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  value={formData.cnpj_mantenedora}
                  onChange={(e) => {
                    const formatted = formatCNPJ(e.target.value)
                    setFormData({ ...formData, cnpj_mantenedora: formatted })
                    if (errors.cnpj_mantenedora) setErrors({ ...errors, cnpj_mantenedora: '' })
                  }}
                  className={`border-[#D3DFE9] focus-visible:ring-[#004B8D] ${
                    errors.cnpj_mantenedora ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                />
                {errors.cnpj_mantenedora && (
                  <p className="text-xs font-medium text-red-500 mt-1">{errors.cnpj_mantenedora}</p>
                )}
              </div>

              {/* Campos exclusivos do relatório de visita ao produtor rural */}
              {isRural && (
                <>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="inscricao_estadual"
                      className="text-sm font-semibold text-[#102A43]"
                    >
                      Inscrição Estadual
                    </Label>
                    <Input
                      id="inscricao_estadual"
                      placeholder="Ex: 19.123.456-7"
                      value={formData.inscricao_estadual}
                      onChange={(e) =>
                        setFormData({ ...formData, inscricao_estadual: e.target.value })
                      }
                      className="border-[#D3DFE9] focus-visible:ring-[#004B8D]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cpf" className="text-sm font-semibold text-[#102A43]">
                      CPF do Produtor / Proprietário
                    </Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      maxLength={14}
                      value={formData.cpf}
                      onChange={(e) => {
                        setFormData({ ...formData, cpf: formatCPF(e.target.value) })
                        if (errors.cpf) setErrors({ ...errors, cpf: '' })
                      }}
                      className={`border-[#D3DFE9] focus-visible:ring-[#004B8D] ${
                        errors.cpf ? 'border-red-500 focus-visible:ring-red-500' : ''
                      }`}
                    />
                    {errors.cpf && (
                      <p className="text-xs font-medium text-red-500 mt-1">{errors.cpf}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ano_safra" className="text-sm font-semibold text-[#102A43]">
                      Ano / Safra
                    </Label>
                    <Input
                      id="ano_safra"
                      placeholder="Ex: 2025/2026"
                      maxLength={9}
                      value={formData.ano_safra}
                      onChange={(e) =>
                        setFormData({ ...formData, ano_safra: formatAnoSafra(e.target.value) })
                      }
                      className="border-[#D3DFE9] focus-visible:ring-[#004B8D]"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Endereço */}
          <div className="pt-2 border-t border-[#D3DFE9]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#004B8D] mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E5A812]" />
              Localização
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5 sm:max-w-[200px]">
                <Label htmlFor="cep" className="text-sm font-semibold text-[#102A43]">
                  CEP
                </Label>
                <Input
                  id="cep"
                  placeholder="00000-000"
                  maxLength={9}
                  value={formData.cep}
                  onChange={(e) => {
                    setFormData({ ...formData, cep: formatCEP(e.target.value) })
                    if (errors.cep) setErrors({ ...errors, cep: '' })
                  }}
                  className={`border-[#D3DFE9] focus-visible:ring-[#004B8D] ${
                    errors.cep ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                />
                {errors.cep && (
                  <p className="text-xs font-medium text-red-500 mt-1">{errors.cep}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endereco" className="text-sm font-semibold text-[#102A43]">
                  Endereço Completo
                </Label>
                <Textarea
                  id="endereco"
                  rows={2}
                  placeholder="Avenida / Rua, número, bairro, CEP, complementos... (opcional se houver coordenadas)"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="border-[#D3DFE9] focus-visible:ring-[#004B8D] resize-none"
                />
              </div>

              <CoordenadasField
                idPrefix="novo"
                latitude={formData.latitude}
                longitude={formData.longitude}
                onChange={({ latitude, longitude }) =>
                  setFormData((prev) => ({ ...prev, latitude, longitude }))
                }
              />
            </div>
          </div>

          {/* Responsável pelas Informações */}
          <div className="pt-2 border-t border-[#D3DFE9]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#004B8D] mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E5A812]" />
              Responsável pelas Informações e Contato
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="responsavel" className="text-sm font-semibold text-[#102A43]">
                  Nome do Responsável
                </Label>
                <Input
                  id="responsavel"
                  placeholder="Ex: Engenheiro(a) ou Diretor(a)"
                  value={formData.responsavel}
                  onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                  className="border-[#D3DFE9] focus-visible:ring-[#004B8D]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cargo_responsavel" className="text-sm font-semibold text-[#102A43]">
                  Cargo / Função
                </Label>
                <Input
                  id="cargo_responsavel"
                  placeholder="Ex: Gerente agrícola, Diretor técnico"
                  value={formData.cargo_responsavel}
                  onChange={(e) => setFormData({ ...formData, cargo_responsavel: e.target.value })}
                  className="border-[#D3DFE9] focus-visible:ring-[#004B8D]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cpf_responsavel" className="text-sm font-semibold text-[#102A43]">
                  CPF do Responsável
                </Label>
                <Input
                  id="cpf_responsavel"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  value={formData.cpf_responsavel}
                  onChange={(e) => {
                    const formatted = formatCPF(e.target.value)
                    setFormData({ ...formData, cpf_responsavel: formatted })
                    if (errors.cpf_responsavel) setErrors({ ...errors, cpf_responsavel: '' })
                  }}
                  className={`border-[#D3DFE9] focus-visible:ring-[#004B8D] ${
                    errors.cpf_responsavel ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                />
                {errors.cpf_responsavel && (
                  <p className="text-xs font-medium text-red-500 mt-1">{errors.cpf_responsavel}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telefone" className="text-sm font-semibold text-[#102A43]">
                  Telefone
                </Label>
                <Input
                  id="telefone"
                  placeholder="(86) 99999-9999"
                  maxLength={16}
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: formatTelefone(e.target.value) })
                  }
                  className="border-[#D3DFE9] focus-visible:ring-[#004B8D]"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="email" className="text-sm font-semibold text-[#102A43]">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contato@empreendimento.com.br"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value })
                    if (errors.email) setErrors({ ...errors, email: '' })
                  }}
                  className={`border-[#D3DFE9] focus-visible:ring-[#004B8D] ${
                    errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                />
                {errors.email && (
                  <p className="text-xs font-medium text-red-500 mt-1">{errors.email}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-[#D3DFE9] flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="order-2 sm:order-1 border-[#D3DFE9] text-[#486581] hover:text-[#102A43] hover:bg-[#F4F6F9] h-10 sm:h-9"
            >
              <X className="w-4 h-4 mr-1.5" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="order-1 sm:order-2 bg-[#004B8D] hover:bg-[#003666] text-white shadow-sm font-semibold h-10 sm:h-9"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" />
                  {isEditing ? 'Salvar Alterações' : 'Salvar Cadastro'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
