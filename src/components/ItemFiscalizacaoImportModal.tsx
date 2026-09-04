import React, { useState, useRef } from 'react'
import Papa from 'papaparse'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Upload,
  FileSpreadsheet,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  Download,
  AlertCircle,
  FolderTree,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { itensFiscalizacaoService } from '@/services/itensFiscalizacao'

interface ItemFiscalizacaoImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hospitalId: string
  hospitalNome: string
  onImportSuccess: (count: number) => void
}

interface CsvRow {
  categoria?: string
  nome_do_item?: string
  nome?: string
  item?: string
  descricao?: string
  descriçao?: string
  observacao?: string
  status?: string
  [key: string]: any
}

interface ProcessedCsvItem {
  categoria: string
  nome: string
  descricao: string
  isValid: boolean
  errors: string[]
}

export function ItemFiscalizacaoImportModal({
  open,
  onOpenChange,
  hospitalId,
  hospitalNome,
  onImportSuccess,
}: ItemFiscalizacaoImportModalProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [importMode, setImportMode] = useState<'upload' | 'paste'>('upload')
  const [pastedText, setPastedText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [processedItems, setProcessedItems] = useState<ProcessedCsvItem[]>([])
  const [importProgress, setImportProgress] = useState(0)

  const resetState = () => {
    setFileName(null)
    setPastedText('')
    setProcessedItems([])
    setImportProgress(0)
    setIsProcessing(false)
    setIsImporting(false)
  }

  const handleModalOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState()
    }
    onOpenChange(newOpen)
  }

  const normalizeHeaderKey = (header: string): string => {
    return header
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
  }

  const parseCsvContent = (csvString: string, sourceName?: string) => {
    if (!csvString.trim()) {
      toast({
        title: 'Conteúdo vazio',
        description: 'Cole ou envie um texto no formato CSV com as colunas necessárias.',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => normalizeHeaderKey(header),
      complete: (results) => {
        const rows = results.data as CsvRow[]
        processRows(rows)
        if (sourceName) setFileName(sourceName)
        setIsProcessing(false)
      },
      error: (error) => {
        console.error('Erro ao analisar CSV:', error)
        toast({
          title: 'Erro no processamento CSV',
          description: 'Não foi possível ler o formato da planilha/texto fornecido.',
          variant: 'destructive',
        })
        setIsProcessing(false)
      },
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (
      !file.name.endsWith('.csv') &&
      file.type !== 'text/csv' &&
      file.type !== 'application/vnd.ms-excel'
    ) {
      toast({
        title: 'Arquivo inválido',
        description: 'Selecione um arquivo de extensão .csv.',
        variant: 'destructive',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      parseCsvContent(text, file.name)
    }
    reader.onerror = () => {
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível ler o arquivo selecionado.',
        variant: 'destructive',
      })
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleProcessPasted = () => {
    if (!pastedText.trim()) {
      toast({
        title: 'Texto vazio',
        description: 'Cole o conteúdo CSV antes de processar.',
        variant: 'destructive',
      })
      return
    }
    parseCsvContent(pastedText, 'Texto Colado')
  }

  const processRows = (rows: CsvRow[]) => {
    const items: ProcessedCsvItem[] = []

    rows.forEach((row) => {
      // Flexibly map columns:
      // categoria: categoria, grupo, agrupamento, setor
      // nome: nome_do_item, nome_item, nome, item, titulo
      // descricao: descricao, descriçao, desc, detalhe, detalhes, requisitos
      const categoria = row.categoria || row.grupo || row.agrupamento || row.setor || row.area || ''

      const nome =
        row.nome_do_item ||
        row.nome_item ||
        row.nome ||
        row.item ||
        row.titulo ||
        row.descricao_do_item ||
        ''

      const descricao =
        row.descricao ||
        row.descriçao ||
        row.desc ||
        row.detalhes ||
        row.detalhe ||
        row.requisitos ||
        ''

      const errors: string[] = []

      if (!categoria.trim()) {
        errors.push('Categoria obrigatória')
      }
      if (!nome.trim()) {
        errors.push('Nome do item obrigatório')
      }

      items.push({
        categoria: categoria.trim(),
        nome: nome.trim(),
        descricao: descricao.trim(),
        isValid: errors.length === 0,
        errors,
      })
    })

    setProcessedItems(items)
  }

  const handleExecuteImport = async () => {
    const validItems = processedItems.filter((i) => i.isValid)
    if (validItems.length === 0) {
      toast({
        title: 'Nenhum item válido',
        description: 'Corrija as linhas inválidas antes de importar.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsImporting(true)
      setImportProgress(0)

      let createdCount = 0
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i]
        await itensFiscalizacaoService.create({
          hospital: hospitalId,
          nome: item.nome,
          categoria: item.categoria,
          descricao: item.descricao,
          status: 'Conforme',
          observacao: '',
        })
        createdCount++
        setImportProgress(Math.round(((i + 1) / validItems.length) * 100))
      }

      toast({
        title: 'Itens importados com sucesso!',
        description: `${createdCount} item(ns) de fiscalização adicionado(s) a "${hospitalNome}".`,
      })

      onImportSuccess(createdCount)
      handleModalOpenChange(false)
    } catch (err) {
      console.error('Erro ao importar itens:', err)
      toast({
        title: 'Erro na importação',
        description: 'Ocorreu um erro ao salvar os itens no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setIsImporting(false)
    }
  }

  const downloadSampleCsv = () => {
    const csvContent =
      'categoria,nome do item,descrição\n' +
      '"Instalações Elétricas","Subestação e Transformador","Verificar manutenção preventiva e laudo SPDA"\n' +
      '"Instalações Elétricas","Gerador de Emergência (Grupo Moto-Gerador)","Checar autonomia de combustível e teste de carga"\n' +
      '"Segurança Contra Incêndio","Sistema de Hidrantes e Mangotinhos","Verificar pressurização e validade de mangueiras"\n' +
      '"Segurança Contra Incêndio","Extintores Portáteis","Verificar selo do Inmetro e data de recarga"\n' +
      '"Climatização e Gases Medicinais","Central de Oxigênio e Ar Comprimido","Verificar cilindros, válvulas e rotina de teste"\n' +
      '"Estrutura e Edificações","Estabilidade Estrutural e Fachada","Verificar ausência de trincas ou infiltrações críticas"'

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `modelo_itens_fiscalizacao_${hospitalNome.toLowerCase().replace(/\s+/g, '_')}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const validCount = processedItems.filter((i) => i.isValid).length
  const errorCount = processedItems.filter((i) => !i.isValid).length

  // Unique categories in the parsed batch
  const categoriesInBatch = Array.from(
    new Set(processedItems.filter((i) => i.isValid).map((i) => i.categoria)),
  )

  return (
    <Dialog open={open} onOpenChange={handleModalOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl bg-white border-[#D3DFE9] text-[#102A43] max-h-[92vh] sm:max-h-[90vh] flex flex-col p-0 rounded-2xl">
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-[#D3DFE9] bg-[#F4F6F9] shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E8F1F8] flex items-center justify-center text-[#004B8D] shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#102A43]">
                  Importar Itens de Fiscalização
                </DialogTitle>
                <DialogDescription className="text-xs text-[#486581] mt-0.5">
                  Vinculando diretamente a{' '}
                  <strong className="text-[#004B8D]">{hospitalNome}</strong>
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadSampleCsv}
              className="border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8] text-xs h-8 shrink-0 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Modelo CSV
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {processedItems.length === 0 ? (
            <Tabs
              value={importMode}
              onValueChange={(val) => setImportMode(val as 'upload' | 'paste')}
              className="w-full"
            >
              <TabsList className="bg-[#E8F1F8] p-1 rounded-lg border border-[#D3DFE9] grid grid-cols-2 mb-4">
                <TabsTrigger
                  value="upload"
                  className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white text-xs font-semibold py-1.5 gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Enviar Arquivo .CSV
                </TabsTrigger>
                <TabsTrigger
                  value="paste"
                  className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white text-xs font-semibold py-1.5 gap-2"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  Colar Texto CSV
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-3 mt-0">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#004B8D]/30 hover:border-[#004B8D] rounded-xl p-8 text-center cursor-pointer bg-[#F4F6F9] hover:bg-[#E8F1F8]/50 transition-colors flex flex-col items-center justify-center space-y-2.5"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv,application/vnd.ms-excel"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-[#E8F1F8] flex items-center justify-center text-[#004B8D]">
                    <Upload className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#102A43]">
                      Clique para escolher o arquivo .CSV ou arraste-o aqui
                    </p>
                    <p className="text-xs text-[#627D98] mt-1">
                      Colunas esperadas: <strong>categoria</strong>, <strong>nome do item</strong>,{' '}
                      <strong>descrição</strong>.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="paste" className="space-y-3 mt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="paste-csv" className="text-xs font-semibold text-[#102A43]">
                      Cole os dados com cabeçalho (categoria, nome do item, descrição):
                    </label>
                  </div>
                  <Textarea
                    id="paste-csv"
                    rows={7}
                    placeholder={`categoria,nome do item,descrição\nInstalações Elétricas,Subestação de Energia,Verificar manutenção preventiva\nSegurança Contra Incêndio,Sistema de Hidrantes,Pressurização e mangueiras`}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="font-mono text-xs border-[#D3DFE9] focus-visible:ring-[#004B8D]"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleProcessPasted}
                      disabled={!pastedText.trim() || isProcessing}
                      className="bg-[#004B8D] hover:bg-[#003666] text-white text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <PlusCircle className="w-3.5 h-3.5" />
                      )}
                      Processar e Visualizar
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            /* Preview Screen */
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F4F6F9] p-3.5 rounded-xl border border-[#D3DFE9]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#102A43]">Origem:</span>
                  <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-[#D3DFE9] text-[#004B8D] font-bold">
                    {fileName || 'CSV'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 gap-1 font-semibold">
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                    {validCount} Válido(s)
                  </Badge>
                  <Badge className="bg-blue-50 text-blue-800 border-blue-300 gap-1 font-semibold">
                    <FolderTree className="w-3.5 h-3.5 text-blue-600" />
                    {categoriesInBatch.length} Categoria(s)
                  </Badge>
                  {errorCount > 0 && (
                    <Badge className="bg-rose-50 text-rose-800 border-rose-300 gap-1 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      {errorCount} Inválido(s)
                    </Badge>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {isImporting && (
                <div className="space-y-1.5 bg-[#E8F1F8] p-3 rounded-lg border border-[#004B8D]/20">
                  <div className="flex justify-between text-xs font-semibold text-[#004B8D]">
                    <span>Cadastrando itens no banco de dados...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2 bg-[#D3DFE9]" />
                </div>
              )}

              {/* Table Preview */}
              <div className="border border-[#D3DFE9] rounded-xl overflow-x-auto max-h-72">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#E8F1F8] text-[#102A43] font-bold sticky top-0 uppercase text-[11px] tracking-wider border-b border-[#D3DFE9]">
                    <tr>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Categoria</th>
                      <th className="p-2.5">Nome do Item</th>
                      <th className="p-2.5">Descrição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D3DFE9]">
                    {processedItems.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50 transition-colors ${
                          !item.isValid ? 'bg-red-50/50' : 'bg-white'
                        }`}
                      >
                        <td className="p-2.5 whitespace-nowrap">
                          {!item.isValid ? (
                            <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                              <AlertCircle className="w-3.5 h-3.5" /> {item.errors.join(', ')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Válido
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-semibold text-[#004B8D]">
                          {item.categoria || '-'}
                        </td>
                        <td className="p-2.5 font-medium text-[#102A43]">{item.nome || '-'}</td>
                        <td className="p-2.5 text-[#627D98] max-w-xs truncate">
                          {item.descricao || (
                            <span className="italic text-slate-400">Sem descrição</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-[#D3DFE9] bg-[#F4F6F9] shrink-0 flex flex-row items-center justify-between">
          {processedItems.length > 0 ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetState}
                disabled={isImporting}
                className="border-[#D3DFE9] text-[#486581]"
              >
                Escolher outro / Voltar
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleModalOpenChange(false)}
                  disabled={isImporting}
                  className="border-[#D3DFE9] text-[#486581]"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleExecuteImport}
                  disabled={isImporting || validCount === 0}
                  className="bg-[#004B8D] hover:bg-[#003666] text-white font-bold px-4 gap-1.5 shadow-sm cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirmar e Gravar ({validCount} itens)
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleModalOpenChange(false)}
                className="border-[#D3DFE9] text-[#486581]"
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
