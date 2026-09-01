import React, { useState, useRef } from 'react'
import Papa from 'papaparse'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  Download,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  tiposEmpreendimentoService,
  TipoEmpreendimento,
  TipoEmpreendimentoFormData,
} from '@/services/tiposEmpreendimento'
import { useToast } from '@/hooks/use-toast'
import { getIconComponent, ICON_OPTIONS } from '@/pages/TiposEmpreendimento'

interface TipoEmpreendimentoImportCsvProps {
  existingTipos: TipoEmpreendimento[]
  onImportCompleted: (createdCount: number, skippedCount: number) => void
  onCancel: () => void
}

interface CsvRow {
  nome?: string
  [key: string]: any
}

interface ProcessedTipoItem {
  data: TipoEmpreendimentoFormData
  isExisting: boolean
  existingId?: string
  isValid: boolean
  errors: string[]
}

export function TipoEmpreendimentoImportCsv({
  existingTipos,
  onImportCompleted,
  onCancel,
}: TipoEmpreendimentoImportCsvProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [processedItems, setProcessedItems] = useState<ProcessedTipoItem[]>([])
  const [importProgress, setImportProgress] = useState(0)
  const [importStats, setImportStats] = useState<{ created: number; skipped: number } | null>(null)
  const [selectedIcon, setSelectedIcon] = useState<string>('Building2')

  // Lookup map by normalized name
  const existingByName = new Map<string, TipoEmpreendimento>()
  existingTipos.forEach((t) => {
    if (t.nome) {
      existingByName.set(t.nome.trim().toLowerCase(), t)
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
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
        console.error('Erro ao processar CSV de tipos:', error)
        toast({
          title: 'Erro ao ler arquivo CSV',
          description: 'Não foi possível ler a planilha fornecida.',
          variant: 'destructive',
        })
        setIsProcessing(false)
      },
    })
  }

  const processRows = (rows: CsvRow[]) => {
    const items: ProcessedTipoItem[] = []
    const seenInFile = new Set<string>()

    rows.forEach((row, index) => {
      // Find "nome" column or common aliases
      const rawNome =
        row.nome ||
        row.tipo ||
        row.tipo_de_empreendimento ||
        row.empreendimento ||
        row.descricao ||
        (Object.values(row)[0] as string) ||
        ''

      const nome = String(rawNome).trim()
      const errors: string[] = []

      if (!nome) {
        errors.push('Coluna "nome" vazia ou ausente')
      } else {
        const norm = nome.toLowerCase()
        if (seenInFile.has(norm)) {
          errors.push('Tipo duplicado no arquivo CSV')
        } else {
          seenInFile.add(norm)
        }
      }

      const existing = nome ? existingByName.get(nome.toLowerCase()) : undefined

      items.push({
        data: {
          nome,
          icone: selectedIcon,
          descricao: `Empreendimento cadastrado via importação em lote CREA-PI`,
        },
        isExisting: !!existing,
        existingId: existing?.id,
        isValid: errors.length === 0,
        errors,
      })
    })

    setProcessedItems(items)
  }

  // If user changes icon before executing import, update all items' icon
  const handleSelectIcon = (iconId: string) => {
    setSelectedIcon(iconId)
    setProcessedItems((prev) =>
      prev.map((item) => ({
        ...item,
        data: {
          ...item.data,
          icone: iconId,
        },
      })),
    )
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
    let skipped = 0

    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i]
      try {
        if (item.isExisting && item.existingId) {
          // It already exists: keep standard without duplicate insertion or update icon/desc
          skipped++
        } else {
          await tiposEmpreendimentoService.create({
            nome: item.data.nome,
            icone: selectedIcon || 'Building2',
            descricao: item.data.descricao || 'Empreendimento regulamentado CREA-PI',
          })
          created++
        }
      } catch (err) {
        console.error('Erro ao importar tipo de empreendimento:', item, err)
      }

      setImportProgress(Math.round(((i + 1) / validItems.length) * 100))
    }

    setIsImporting(false)
    setImportStats({ created, skipped })
    toast({
      title: 'Importação concluída!',
      description: `${created} novo(s) tipo(s) de empreendimento criado(s).${
        skipped > 0 ? ` ${skipped} já existia(m) e foram mantido(s).` : ''
      }`,
    })

    onImportCompleted(created, skipped)
  }

  const downloadSampleCsv = () => {
    const csvContent =
      'nome\n' +
      '"Fazenda / Agronegócio"\n' +
      '"Indústria e Mineração"\n' +
      '"Usinas de Energia Solar / Eólica"\n' +
      '"Posto de Combustíveis e GNV"\n' +
      '"Construção Civil / Edificações"\n' +
      '"Saneamento e Tratamento de Água"\n' +
      '"Telecomunicações e Redes"\n' +
      '"Indústria Farmacêutica"'

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'modelo_importacao_tipos_empreendimento_creapi.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const newCount = processedItems.filter((i) => !i.isExisting && i.isValid).length
  const existingCount = processedItems.filter((i) => i.isExisting && i.isValid).length
  const errorCount = processedItems.filter((i) => !i.isValid).length

  const SelectedIconComp = getIconComponent(selectedIcon)

  return (
    <div className="bg-white rounded-2xl border border-[#D3DFE9] p-6 shadow-sm space-y-6 animate-page-enter">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D3DFE9] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#102A43] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#004B8D]" />
              Importação em Lote de Tipos de Empreendimento via CSV
            </h2>
            <Badge className="bg-[#004B8D]/10 text-[#004B8D] border-0 text-[11px] font-bold">
              Admin CREA-PI
            </Badge>
          </div>
          <p className="text-xs text-[#486581] mt-1">
            Envie um arquivo CSV contendo apenas a coluna <strong>nome</strong> com a relação dos
            novos empreendimentos a serem cadastrados (ex.: Fazenda, Indústria, Usina Solar, etc.).
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={downloadSampleCsv}
          className="border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8] font-semibold text-xs h-9 shrink-0 gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[#004B8D]" />
          Baixar Modelo CSV
        </Button>
      </div>

      {/* Upload Box */}
      {!file && (
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#004B8D]/35 hover:border-[#004B8D] rounded-2xl p-8 text-center cursor-pointer bg-[#F4F6F9] hover:bg-[#E8F1F8]/40 transition-colors flex flex-col items-center justify-center space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-[#E8F1F8] flex items-center justify-center text-[#004B8D] shadow-xs">
              <Upload className="w-7 h-7 stroke-[2]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#102A43]">
                Clique para selecionar ou arraste o arquivo CSV aqui
              </p>
              <p className="text-xs text-[#627D98]">
                O arquivo deve conter o cabeçalho <strong>nome</strong> na primeira linha.
              </p>
            </div>
          </div>

          {/* Icon standard picker for imported items */}
          <div className="bg-[#F4F6F9] rounded-xl p-4 border border-[#D3DFE9]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SelectedIconComp className="w-4 h-4 text-[#004B8D]" />
                <span className="text-xs font-bold text-[#102A43]">
                  Ícone padrão para os itens importados:
                </span>
              </div>
              <span className="text-[11px] text-[#627D98]">
                Todos os itens do CSV receberão este ícone inicial (editável individualmente depois)
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2 mt-2">
              {ICON_OPTIONS.map((opt) => {
                const IconComponent = opt.icon
                const isSelected = selectedIcon === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectIcon(opt.id)}
                    className={`p-2 rounded-lg border text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#004B8D] text-white border-[#004B8D] shadow-sm font-semibold'
                        : 'bg-white text-[#334E68] border-[#D3DFE9] hover:border-[#004B8D]/50 hover:bg-[#E8F1F8]'
                    }`}
                    title={opt.label}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="text-[10px] truncate max-w-full text-center px-1">
                      {opt.label.split('/')[0].trim()}
                    </span>
                  </button>
                )
              })}
            </div>
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
              <span className="font-mono text-xs bg-white px-2.5 py-1 rounded-md border border-[#D3DFE9] text-[#004B8D] font-bold">
                {file.name}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 gap-1 font-semibold">
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                {newCount} Novo(s) Tipo(s)
              </Badge>
              {existingCount > 0 && (
                <Badge className="bg-blue-50 text-blue-800 border border-blue-300 gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  {existingCount} Já Cadastrado(s)
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge className="bg-rose-50 text-rose-800 border border-rose-300 gap-1 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  {errorCount} Inválido(s)
                </Badge>
              )}
            </div>
          </div>

          {/* Icon configuration while in preview */}
          <div className="bg-white rounded-xl p-3 border border-[#D3DFE9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E8F1F8] flex items-center justify-center text-[#004B8D]">
                <SelectedIconComp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#102A43] block">
                  Ícone aplicado na importação:
                </span>
                <span className="text-[11px] text-[#627D98]">
                  {ICON_OPTIONS.find((o) => o.id === selectedIcon)?.label || selectedIcon}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {ICON_OPTIONS.slice(0, 8).map((opt) => {
                const IconComponent = opt.icon
                const isSelected = selectedIcon === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectIcon(opt.id)}
                    className={`p-1.5 rounded-md border text-xs flex items-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#004B8D] text-white border-[#004B8D] font-bold'
                        : 'bg-white text-[#486581] border-[#D3DFE9] hover:bg-slate-50'
                    }`}
                    title={opt.label}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span className="text-[10px] hidden md:inline">{opt.label.split('/')[0]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Progress Bar during Import */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-[#102A43]">
                <span>Cadastrando tipos no banco de dados CREA-PI...</span>
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
                  <th className="p-3">#</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Nome do Tipo de Empreendimento</th>
                  <th className="p-3">Ícone Atribuído</th>
                  <th className="p-3">Validação / Observação</th>
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
                    <td className="p-3 font-mono text-[#627D98]">{idx + 1}</td>
                    <td className="p-3 whitespace-nowrap">
                      {!item.isValid ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                          <AlertCircle className="w-3.5 h-3.5" /> Erro
                        </span>
                      ) : item.isExisting ? (
                        <span className="inline-flex items-center gap-1 text-blue-700 font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Já existe
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <PlusCircle className="w-3.5 h-3.5" /> Novo tipo
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-[#102A43] text-sm">
                      {item.data.nome || '-'}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <SelectedIconComp className="w-4 h-4 text-[#004B8D]" />
                        <span className="font-mono text-xs text-[#486581]">{selectedIcon}</span>
                      </div>
                    </td>
                    <td className="p-3 text-red-600 font-medium">
                      {item.errors.join(', ') || (
                        <span className="text-emerald-700 text-[11px] font-semibold">
                          Pronto para cadastrar
                        </span>
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
              className="border-[#D3DFE9] text-[#486581] hover:text-[#102A43] cursor-pointer"
            >
              Escolher outro arquivo CSV
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isImporting}
                className="border-[#D3DFE9] text-[#486581] cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting || newCount === 0}
                className="bg-[#004B8D] hover:bg-[#003666] text-white font-bold h-10 px-5 shadow-sm cursor-pointer gap-2"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Cadastrando tipos...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar e Cadastrar {newCount} Tipo(s)
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
