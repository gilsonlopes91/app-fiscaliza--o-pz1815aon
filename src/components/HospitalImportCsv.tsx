import React, { useState, useRef, useEffect } from 'react'
import Papa from 'papaparse'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  ArrowRight,
  Download,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Hospital, HospitalFormData } from '@/services/hospitais'
import { tiposEmpreendimentoService, TipoEmpreendimento } from '@/services/tiposEmpreendimento'
import { formatCNPJ, formatCNES } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'

interface HospitalImportCsvProps {
  existingHospitais: Hospital[]
  onImportCompleted: (createdCount: number, updatedCount: number) => void
  onCancel: () => void
}

interface CsvRow {
  nome?: string
  municipio?: string
  cnes?: string
  cnpj?: string
  cnpj_mantenedora?: string
  tipo?: string
  endereco?: string
  responsavel?: string
  cpf_responsavel?: string
  [key: string]: any
}

interface ProcessedItem {
  data: HospitalFormData
  isExisting: boolean
  existingId?: string
  isValid: boolean
  errors: string[]
}

export function HospitalImportCsv({
  existingHospitais,
  onImportCompleted,
  onCancel,
}: HospitalImportCsvProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([])
  const [importProgress, setImportProgress] = useState(0)
  const [importStats, setImportStats] = useState<{ created: number; updated: number } | null>(null)
  const [tiposEmpreendimento, setTiposEmpreendimento] = useState<TipoEmpreendimento[]>([])

  useEffect(() => {
    tiposEmpreendimentoService
      .getAll()
      .then((data) => setTiposEmpreendimento(data))
      .catch((err) => console.error('Erro ao carregar tipos no importador CSV:', err))
  }, [])

  // Create quick lookup map for CNES
  const existingByCnes = new Map<string, Hospital>()
  existingHospitais.forEach((h) => {
    if (h.cnes) {
      existingByCnes.set(h.cnes.replace(/\D/g, ''), h)
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo no formato .CSV.',
        variant: 'destructive',
      })
      return
    }

    setFile(selectedFile)
    parseCsv(selectedFile)
  }

  const normalizeKey = (key: string): string => {
    return key
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
  }

  const parseCsv = (fileToParse: File) => {
    setIsProcessing(true)
    Papa.parse(fileToParse, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => normalizeKey(header),
      complete: (results) => {
        processRows(results.data as CsvRow[])
        setIsProcessing(false)
      },
      error: (error) => {
        console.error('Erro ao processar CSV:', error)
        toast({
          title: 'Erro ao ler arquivo',
          description: 'Não foi possível ler o arquivo CSV fornecido.',
          variant: 'destructive',
        })
        setIsProcessing(false)
      },
    })
  }

  const processRows = (rows: CsvRow[]) => {
    const items: ProcessedItem[] = []

    rows.forEach((row) => {
      // Find matching keys flexibly
      const nome =
        row.nome ||
        row.hospital ||
        row.estabelecimento ||
        row.razao_social ||
        row.nome_fantasia ||
        ''
      const municipio = row.municipio || row.cidade || ''
      const rawCnes = String(row.cnes || row.cod_cnes || row.codigo_cnes || '').trim()
      const cnes = rawCnes.replace(/\D/g, '')
      const cnpj = row.cnpj || ''
      const cnpj_mantenedora = row.cnpj_mantenedora || row.cnpj_mantenedor || row.mantenedora || ''
      const tipo = row.tipo || row.tipo_unidade || row.tipo_empreendimento || 'Hospital'
      const endereco = row.endereco || row.logradouro || ''
      const responsavel = row.responsavel || row.diretor || ''
      const cpf_responsavel = row.cpf_responsavel || row.cpf || ''

      const errors: string[] = []

      if (!nome.trim()) {
        errors.push('Nome obrigatório')
      }
      if (!municipio.trim()) {
        errors.push('Município obrigatório')
      }
      if (!cnes) {
        errors.push('CNES obrigatório')
      } else if (cnes.length !== 7) {
        errors.push('CNES deve ter 7 dígitos')
      }

      const existing = existingByCnes.get(cnes)

      items.push({
        data: {
          nome: nome.trim(),
          municipio: municipio.trim(),
          cnes: cnes,
          cnpj: cnpj.trim(),
          cnpj_mantenedora: cnpj_mantenedora.trim(),
          tipo: tipo.trim() || 'Hospital',
          endereco: endereco.trim(),
          responsavel: responsavel.trim(),
          cpf_responsavel: cpf_responsavel.trim(),
        },
        isExisting: !!existing,
        existingId: existing?.id,
        isValid: errors.length === 0,
        errors,
      })
    })

    setProcessedItems(items)
  }

  const handleExecuteImport = async () => {
    const validItems = processedItems.filter((item) => item.isValid)
    if (validItems.length === 0) {
      toast({
        title: 'Nenhum registro válido',
        description: 'Corrija os erros na planilha antes de importar.',
        variant: 'destructive',
      })
      return
    }

    setIsImporting(true)
    setImportProgress(0)

    let created = 0
    let updated = 0

    const { hospitaisService } = await import('@/services/hospitais')

    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i]
      try {
        if (item.isExisting && item.existingId) {
          await hospitaisService.update(item.existingId, item.data)
          updated++
        } else {
          await hospitaisService.create(item.data)
          created++
        }
      } catch (err) {
        console.error('Erro ao importar linha:', item, err)
      }

      setImportProgress(Math.round(((i + 1) / validItems.length) * 100))
    }

    setIsImporting(false)
    setImportStats({ created, updated })
    toast({
      title: 'Importação concluída com sucesso!',
      description: `${created} novo(s) hospital(is) criado(s) e ${updated} atualizado(s).`,
    })

    onImportCompleted(created, updated)
  }

  const downloadSampleCsv = () => {
    const csvContent =
      'nome,municipio,cnes,cnpj,cnpj_mantenedora,tipo,endereco,responsavel,cpf_responsavel\n' +
      '"Hospital Regional Justino Luz","Picos","2365478","06.554.123/0001-90","06.554.123/0001-90","Hospital","Praça Antenor Neiva, s/n - Centro","Eng. Carlos Eduardo","123.456.789-00"\n' +
      '"Hospital Estadual Dirceu Arcoverde","Parnaíba","2365494","06.554.123/0002-71","06.554.123/0001-90","Hospital","Av. São Sebastião, 2500 - Fátima","Dra. Maria Helena","987.654.321-99"\n' +
      '"Clínica de Olhos do Piauí","Teresina","2365516","12.345.678/0001-99","","Clínica Médica","Rua Desembargador Pires de Castro, 450 - Centro","Dr. Marcos Santos","111.222.333-44"'

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'modelo_importacao_hospitais_creapi.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const newCount = processedItems.filter((i) => !i.isExisting && i.isValid).length
  const updateCount = processedItems.filter((i) => i.isExisting && i.isValid).length
  const errorCount = processedItems.filter((i) => !i.isValid).length

  return (
    <div className="bg-white rounded-xl border border-[#D3DFE9] p-6 shadow-sm space-y-6 animate-page-enter">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D3DFE9] pb-5">
        <div>
          <h2 className="text-xl font-bold text-[#102A43] flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#004B8D]" />
            Importação de Hospitais e Estabelecimentos via CSV
          </h2>
          <p className="text-xs text-[#486581] mt-1">
            Envie uma planilha com colunas: <strong>nome, municipio, cnes</strong> (obrigatórios),
            cnpj, cnpj_mantenedora, tipo, endereco, responsavel, cpf_responsavel.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={downloadSampleCsv}
          className="border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8] font-semibold text-xs h-9 shrink-0 gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-[#004B8D]" />
          Baixar Modelo CSV
        </Button>
      </div>

      {/* Upload Box */}
      {!file && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#004B8D]/30 hover:border-[#004B8D] rounded-xl p-8 text-center cursor-pointer bg-[#F4F6F9] hover:bg-[#E8F1F8]/50 transition-colors flex flex-col items-center justify-center space-y-3"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-[#E8F1F8] flex items-center justify-center text-[#004B8D] shadow-xs">
            <Upload className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#102A43]">
              Clique para selecionar ou arraste sua planilha CSV aqui
            </p>
            <p className="text-xs text-[#627D98] mt-1">
              O sistema identifica automaticamente unidades já cadastradas através do código{' '}
              <strong>CNES</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {file && (
        <div className="space-y-5">
          {/* Summary Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F4F6F9] p-4 rounded-xl border border-[#D3DFE9]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[#102A43]">Arquivo:</span>
              <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-[#D3DFE9] text-[#004B8D] font-bold">
                {file.name}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 gap-1 font-semibold">
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                {newCount} Novo(s)
              </Badge>
              <Badge className="bg-blue-50 text-blue-800 border border-blue-300 gap-1 font-semibold">
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                {updateCount} Atualização(ões) por CNES
              </Badge>
              {errorCount > 0 && (
                <Badge className="bg-rose-50 text-rose-800 border border-rose-300 gap-1 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  {errorCount} Inválido(s)
                </Badge>
              )}
            </div>
          </div>

          {/* Progress Bar during Import */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-[#102A43]">
                <span>Importando registros para o banco de dados...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-2 bg-[#D3DFE9]" />
            </div>
          )}

          {/* Table Preview */}
          <div className="border border-[#D3DFE9] rounded-xl overflow-x-auto max-h-96">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#E8F1F8] text-[#102A43] font-bold sticky top-0 uppercase text-[11px] tracking-wider border-b border-[#D3DFE9]">
                <tr>
                  <th className="p-3">Status</th>
                  <th className="p-3">CNES</th>
                  <th className="p-3">Nome da Unidade</th>
                  <th className="p-3">Município</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">CNPJ</th>
                  <th className="p-3">Erros / Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D3DFE9]">
                {processedItems.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50 transition-colors ${
                      !item.isValid
                        ? 'bg-red-50/50'
                        : item.isExisting
                          ? 'bg-blue-50/30'
                          : 'bg-white'
                    }`}
                  >
                    <td className="p-3 whitespace-nowrap">
                      {!item.isValid ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                          <AlertCircle className="w-3.5 h-3.5" /> Erro
                        </span>
                      ) : item.isExisting ? (
                        <span className="inline-flex items-center gap-1 text-blue-700 font-bold">
                          <RefreshCw className="w-3 h-3" /> Já existe (atualizar)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <PlusCircle className="w-3.5 h-3.5" /> Novo hospital
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-[#004B8D]">
                      {item.data.cnes || '-'}
                    </td>
                    <td className="p-3 font-semibold text-[#102A43] max-w-xs truncate">
                      {item.data.nome || '-'}
                    </td>
                    <td className="p-3 text-[#486581]">{item.data.municipio || '-'}</td>
                    <td className="p-3 text-[#486581]">{item.data.tipo || 'Hospital'}</td>
                    <td className="p-3 font-mono text-[#627D98]">
                      {item.data.cnpj ? formatCNPJ(item.data.cnpj) : '-'}
                    </td>
                    <td className="p-3 text-red-600 font-medium">
                      {item.errors.join(', ') || (
                        <span className="text-emerald-700 text-[11px] font-semibold">Pronto</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-[#D3DFE9]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFile(null)
                setProcessedItems([])
                setImportStats(null)
              }}
              disabled={isImporting}
              className="border-[#D3DFE9] text-[#486581] hover:text-[#102A43]"
            >
              Escolher outro arquivo
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isImporting}
                className="border-[#D3DFE9] text-[#486581]"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting || newCount + updateCount === 0}
                className="bg-[#004B8D] hover:bg-[#003666] text-white font-bold h-10 px-5 shadow-sm cursor-pointer gap-2"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processando importação...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar e Importar {newCount + updateCount} Estabelecimento(s)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
