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
  Layers,
  FileCheck2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  categoriasVistoriaService,
  CategoriaVistoria,
  SubitemChecklist,
} from '@/services/categoriasVistoria'
import { useToast } from '@/hooks/use-toast'

interface ChecklistImportCsvProps {
  tipoNome: string
  existingCategorias: CategoriaVistoria[]
  existingSubitens: SubitemChecklist[]
  onImportCompleted: () => void
  onCancel: () => void
}

interface CsvRow {
  [key: string]: any
}

export interface ProcessedChecklistRow {
  itemPrincipal: string
  subitemCodigo: string
  descricao: string
  exigeArt: boolean
  periodicidadeDias: number | null
  isValid: boolean
  errors: string[]
}

export function ChecklistImportCsv({
  tipoNome,
  existingCategorias,
  existingSubitens,
  onImportCompleted,
  onCancel,
}: ChecklistImportCsvProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [processedRows, setProcessedRows] = useState<ProcessedChecklistRow[]>([])
  const [importProgress, setImportProgress] = useState(0)

  const normalizeKey = (key: string): string => {
    return key
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
  }

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
        console.error('Erro ao processar CSV de checklist:', error)
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
    const parsed: ProcessedChecklistRow[] = []

    rows.forEach((row) => {
      // 1. Item Principal (agrupador)
      const rawItemPrincipal =
        row.item_principal ||
        row.itemprincipal ||
        row.item ||
        row.grupo ||
        row.tema ||
        row.categoria ||
        ''
      const itemPrincipal = String(rawItemPrincipal).trim()

      // 2. Subitem (código como 1.1, 1.2 ou ordem)
      const rawSubitem =
        row.subitem || row.codigo || row.codigo_subitem || row.num_subitem || row.numero || ''
      const subitemCodigo = String(rawSubitem).trim()

      // 3. Descrição da atividade
      const rawDescricao =
        row.descricao ||
        row.atividade ||
        row.item_de_fiscalizacao ||
        row.descricao_subitem ||
        row.nome ||
        ''
      const descricao = String(rawDescricao).trim()

      // 4. Exige ART (Sim / Não)
      const rawArt = row.exige_art || row.exigeart || row.art || row.requer_art || ''
      const artStr = String(rawArt).trim().toLowerCase()
      const exigeArt =
        artStr === 'sim' ||
        artStr === 's' ||
        artStr === 'true' ||
        artStr === '1' ||
        artStr === 'exige' ||
        artStr === 'requer' ||
        artStr === '' // padrão = true se em branco

      // 5. Periodicidade em dias (em branco = null)
      const rawPeriod =
        row.periodicidade || row.periodicidade_em_dias || row.periodicidade_dias || row.dias || ''
      let periodicidadeDias: number | null = null
      if (rawPeriod !== undefined && rawPeriod !== null && String(rawPeriod).trim() !== '') {
        const num = parseInt(String(rawPeriod).replace(/\D/g, ''), 10)
        if (!isNaN(num) && num > 0) {
          periodicidadeDias = num
        }
      }

      // Validação
      const errors: string[] = []
      if (!itemPrincipal) {
        errors.push('Item principal (agrupador) não informado')
      }
      if (!descricao) {
        errors.push('Descrição da atividade/subitem não informada')
      }

      parsed.push({
        itemPrincipal,
        subitemCodigo,
        descricao,
        exigeArt,
        periodicidadeDias,
        isValid: errors.length === 0,
        errors,
      })
    })

    setProcessedRows(parsed)
  }

  const handleExecuteImport = async () => {
    const validRows = processedRows.filter((r) => r.isValid)
    if (validRows.length === 0) {
      toast({
        title: 'Nenhuma linha válida',
        description: 'Corrija os erros indicados na tabela antes de importar.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsImporting(true)
      setImportProgress(0)

      // 1. Agrupar linhas por Item Principal mantendo ordem de aparição
      const groupsMap = new Map<string, ProcessedChecklistRow[]>()
      validRows.forEach((row) => {
        const key = row.itemPrincipal
        if (!groupsMap.has(key)) {
          groupsMap.set(key, [])
        }
        groupsMap.get(key)!.push(row)
      })

      // Buscar categorias existentes deste tipo
      const currentCats = await categoriasVistoriaService.getByTipo(tipoNome)
      const catMap = new Map<string, CategoriaVistoria>()
      currentCats.forEach((c) => catMap.set(c.nome.trim().toLowerCase(), c))

      let highestOrder = currentCats.reduce((max, c) => Math.max(max, c.ordem || 0), 0)

      let totalSubitensCriados = 0
      let totalPrincipaisCriados = 0
      const totalSteps = validRows.length + groupsMap.size
      let completedSteps = 0

      // Processar cada grupo
      for (const [nomePrincipal, subRows] of groupsMap.entries()) {
        const normName = nomePrincipal.trim().toLowerCase()
        let cat = catMap.get(normName)

        if (!cat) {
          highestOrder++
          cat = await categoriasVistoriaService.create({
            nome: nomePrincipal.trim(),
            tipo: tipoNome,
            ordem: highestOrder,
          })
          catMap.set(normName, cat)
          totalPrincipaisCriados++
        }

        completedSteps++
        setImportProgress(Math.round((completedSteps / totalSteps) * 100))

        // Buscar subitens já existentes desta categoria para evitar duplicação idêntica
        const existingSubsInCat = await categoriasVistoriaService.getSubitensByCategoria(cat.id)
        const existingDescSet = new Set(
          existingSubsInCat.map((s) => s.descricao.trim().toLowerCase()),
        )

        let subOrdem = existingSubsInCat.reduce((max, s) => Math.max(max, s.ordem || 0), 0)

        for (let i = 0; i < subRows.length; i++) {
          const subRow = subRows[i]
          const subDescNorm = subRow.descricao.trim().toLowerCase()

          if (!existingDescSet.has(subDescNorm)) {
            subOrdem++
            const finalCode = subRow.subitemCodigo || `${cat.ordem || highestOrder}.${subOrdem}`

            await categoriasVistoriaService.createSubitem({
              categoria: cat.id,
              tipo: tipoNome,
              ordem: subOrdem,
              codigo: finalCode,
              descricao: subRow.descricao.trim(),
              exigeArt: subRow.exigeArt,
              periodicidadeDias: subRow.periodicidadeDias,
            })

            existingDescSet.add(subDescNorm)
            totalSubitensCriados++
          }

          completedSteps++
          setImportProgress(Math.round((completedSteps / totalSteps) * 100))
        }
      }

      toast({
        title: 'Checklist importado com sucesso!',
        description: `${totalPrincipaisCriados} tema(s) principal(is) e ${totalSubitensCriados} subitem(ns) adicionados a ${tipoNome}.`,
      })

      onImportCompleted()
    } catch (err) {
      console.error('Erro ao importar checklist:', err)
      toast({
        title: 'Erro na importação',
        description: 'Ocorreu um erro ao gravar o checklist no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setIsImporting(false)
    }
  }

  const downloadSampleCsv = () => {
    const csvContent =
      'item_principal,subitem,descricao,exige_art,periodicidade_dias\n' +
      '"Ar-condicionado e Ventilação","1.1","Manutenção e limpeza periódica dos dutos e filtros de climatização (PMOC)","Sim","90"\n' +
      '"Ar-condicionado e Ventilação","1.2","Anotação de Responsabilidade Técnica (ART) do engenheiro mecânico responsável","Sim","365"\n' +
      '"Instalações Elétricas e Subestação","2.1","Inspeção termográfica e laudo dos quadros de distribuição","Sim","180"\n' +
      '"Instalações Elétricas e Subestação","2.2","Manutenção preventiva de transformadores e cabine primária","Sim","365"\n' +
      '"Instalações Elétricas e Subestação","2.3","Verificação do sistema de iluminação de emergência e rotas de fuga","Não",""\n' +
      '"SPDA (Para-raios)","3.1","Laudo de inspeção do SPDA e continuidade elétrica das descidas conforme NBR 5419","Sim","365"\n' +
      '"Sistemas de Combate a Incêndio","4.1","Teste hidrostático e recarga anual de extintores de incêndio","Sim","365"\n' +
      '"Sistemas de Combate a Incêndio","4.2","Pressurização e manutenção de bombas de hidrantes e sprinklers","Sim","180"\n' +
      '"Grupo Gerador","5.1","Teste semanal de carga e verificação do nível de óleo/combustível","Não",""\n' +
      '"Grupo Gerador","5.2","Manutenção corretiva/preventiva com emissão de ART mecânica/elétrica","Sim","365"'

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `modelo_checklist_dois_niveis_${tipoNome.toLowerCase().replace(/\s+/g, '_')}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const validCount = processedRows.filter((r) => r.isValid).length
  const errorCount = processedRows.filter((r) => !r.isValid).length
  const uniqueTemas = new Set(processedRows.filter((r) => r.isValid).map((r) => r.itemPrincipal))
    .size

  return (
    <div className="bg-white rounded-2xl border border-[#D3DFE9] p-6 shadow-sm space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D3DFE9] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-[#102A43] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#004B8D]" />
              Importar Checklist Específico em Dois Níveis ({tipoNome})
            </h2>
            <Badge className="bg-[#004B8D]/10 text-[#004B8D] border-0 text-[11px] font-bold">
              Admin
            </Badge>
          </div>
          <p className="text-xs text-[#486581] mt-1 max-w-3xl leading-relaxed">
            Importe a estrutura completa de uma vez: <strong>Item Principal</strong>{' '}
            (agrupador/tema) e <strong>Subitens</strong> (atividades com exigência de ART e
            periodicidade em dias).
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
          Baixar Modelo CSV (2 Níveis)
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
                Clique para selecionar ou arraste o arquivo CSV de checklist aqui
              </p>
              <p className="text-xs text-[#627D98]">
                Colunas aceitas: <strong>item_principal</strong>, <strong>subitem</strong> (ex:
                1.1), <strong>descricao</strong>, <strong>exige_art</strong> (Sim/Não) e{' '}
                <strong>periodicidade_dias</strong> (dias, podendo ficar em branco).
              </p>
            </div>
          </div>

          <div className="bg-[#F4F6F9] rounded-xl p-4 border border-[#D3DFE9] text-xs text-[#486581] space-y-1.5">
            <div className="font-bold text-[#102A43] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#004B8D]" />
              Como a estrutura em 2 níveis será criada:
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-[#486581]">
              <li>
                <strong>Item Principal (Tema):</strong> Agrupador numerado automaticamente (1, 2,
                3...) como título na tela.
              </li>
              <li>
                <strong>Subitem:</strong> Atividade fiscalizada (1.1, 1.2...) onde ficam a exigência
                de ART e periodicidade.
              </li>
              <li>
                Caso o item principal já exista no tipo, os subitens serão adicionados dentro dele
                sem duplicação.
              </li>
            </ul>
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
              <Badge className="bg-blue-50 text-blue-800 border border-blue-300 gap-1 font-semibold">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                {uniqueTemas} Itens Principais (Temas)
              </Badge>
              <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 gap-1 font-semibold">
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                {validCount} Subitens Válidos
              </Badge>
              {errorCount > 0 && (
                <Badge className="bg-rose-50 text-rose-800 border border-rose-300 gap-1 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  {errorCount} Linha(s) com Erro
                </Badge>
              )}
            </div>
          </div>

          {/* Progress Bar during Import */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-[#102A43]">
                <span>Cadastrando estrutura de checklist em 2 níveis no CREA-PI...</span>
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
                  <th className="p-3">Item Principal (Agrupador)</th>
                  <th className="p-3">Código</th>
                  <th className="p-3">Descrição do Subitem</th>
                  <th className="p-3">Exige ART</th>
                  <th className="p-3">Periodicidade</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D3DFE9]">
                {processedRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50 transition-colors ${
                      !row.isValid ? 'bg-rose-50/50' : 'bg-white'
                    }`}
                  >
                    <td className="p-3 font-mono text-[#627D98]">{idx + 1}</td>
                    <td className="p-3 font-bold text-[#102A43]">
                      {row.itemPrincipal || <span className="text-rose-500 italic">Ausente</span>}
                    </td>
                    <td className="p-3 font-mono font-semibold text-[#004B8D]">
                      {row.subitemCodigo || '-'}
                    </td>
                    <td className="p-3 text-[#334E68] max-w-md">
                      {row.descricao || <span className="text-rose-500 italic">Ausente</span>}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          row.exigeArt
                            ? 'bg-[#E8F1F8] text-[#004B8D]'
                            : 'bg-slate-100 text-[#627D98]'
                        }`}
                      >
                        {row.exigeArt ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap text-[#102A43]">
                      {row.periodicidadeDias ? (
                        <span className="font-semibold">{row.periodicidadeDias} dias</span>
                      ) : (
                        <span className="text-[#829AB1] italic">Sem prazo fixo</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {row.isValid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Pronto
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-rose-600 font-semibold"
                          title={row.errors.join('; ')}
                        >
                          <AlertCircle className="w-3.5 h-3.5" /> {row.errors[0]}
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
                setProcessedRows([])
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
                disabled={isImporting || validCount === 0}
                className="bg-[#004B8D] hover:bg-[#003666] text-white font-bold h-10 px-5 shadow-sm cursor-pointer gap-2"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Populando checklist...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar e Importar {validCount} Subitem(ns) em {tipoNome}
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
