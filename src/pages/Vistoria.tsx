import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ClipboardCheck,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Layers,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Plus,
  RefreshCw,
  Search,
  X,
  Loader2,
  CheckCircle,
  Save,
  HelpCircle,
  Sparkles,
  FileText,
  Download,
  FolderArchive,
  Lock,
  Unlock,
  Calendar,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { hospitaisService, Hospital } from '@/services/hospitais'
import {
  categoriasVistoriaService,
  CategoriaVistoria,
  SubitemChecklist,
} from '@/services/categoriasVistoria'
import { tiposEmpreendimentoService, TipoEmpreendimento } from '@/services/tiposEmpreendimento'
import {
  vistoriasService,
  Vistoria,
  VistoriaItem,
  VistoriaItemFormData,
  calculateItemSituacao,
  calcularVencimentoSubitem,
  SituacaoChecklist,
} from '@/services/vistorias'
import { PhotoUploadSection } from '@/components/PhotoUploadSection'
import { NovaVistoriaDialog } from '@/components/NovaVistoriaDialog'
import { VistoriaCard } from '@/components/VistoriaCard'
import { getIconComponent } from '@/pages/TiposEmpreendimento'
import { useToast } from '@/hooks/use-toast'
import { formatCNPJ } from '@/lib/formatters'
import { useAuth } from '@/contexts/AuthContext'
import { generateVistoriaPdf } from '@/lib/pdfReport'
import { downloadAllVistoriaPhotosZip } from '@/lib/photoDownload'
import { PhotoCaptureMetadata } from '@/lib/watermark'
import { atribuicoesService } from '@/services/atribuicoes'

export default function VistoriaPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const urlHospitalId = searchParams.get('hospitalId')
  const urlVistoriaId = searchParams.get('vistoriaId')
  const urlTipo = searchParams.get('tipo')

  // Global states
  const [tiposEmpreendimento, setTiposEmpreendimento] = useState<TipoEmpreendimento[]>([])
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [allCategorias, setAllCategorias] = useState<CategoriaVistoria[]>([])
  const [allSubitens, setAllSubitens] = useState<SubitemChecklist[]>([])
  const [allVistorias, setAllVistorias] = useState<Vistoria[]>([])
  const [openVistorias, setOpenVistorias] = useState<Vistoria[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Type filter for vistorias list
  const [selectedTipoFiltro, setSelectedTipoFiltro] = useState<string>(urlTipo || 'todos')

  // Active Vistoria Selection
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(urlHospitalId || '')
  const [currentVistoria, setCurrentVistoria] = useState<Vistoria | null>(null)
  const [vistoriaItens, setVistoriaItens] = useState<VistoriaItem[]>([])
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(false)

  // Local Form state for each SUBITEM (keyed by subitem.id or categoria.id fallback)
  const [itemForms, setItemForms] = useState<Record<string, VistoriaItemFormData>>({})
  const [pendingPhotos, setPendingPhotos] = useState<Record<string, File[]>>({})
  const [pendingPhotosMeta, setPendingPhotosMeta] = useState<
    Record<string, PhotoCaptureMetadata[]>
  >({})
  const [deletedPhotos, setDeletedPhotos] = useState<Record<string, string[]>>({})
  const [savingSubitemIds, setSavingSubitemIds] = useState<Record<string, boolean>>({})

  // Auto-save state indicator: 'idle' | 'saving' | 'saved' | 'error'
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const [lastSavedTime, setLastSavedTime] = useState<string>('')
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  const isInitialLoadRef = React.useRef(true)

  // Batch "Não se aplica" marking loading tracking per category (Nível 1)
  const [batchMarkingCatIds, setBatchMarkingCatIds] = useState<Record<string, boolean>>({})

  // Finalizar / Reabrir Vistoria dialogs & actions
  const [isFinalizarDialogOpen, setIsFinalizarDialogOpen] = useState(false)
  const [isFinalizando, setIsFinalizando] = useState(false)
  const [isReabrindo, setIsReabrindo] = useState(false)

  // Loading states for PDF report generation and ZIP download
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfProgressText, setPdfProgressText] = useState('')
  const [generatingCardPdfId, setGeneratingCardPdfId] = useState<string | null>(null)
  const [isDownloadingZip, setIsDownloadingZip] = useState(false)
  const [zipProgressText, setZipProgressText] = useState('')

  // Modal for new inspection
  const [isNovaVistoriaOpen, setIsNovaVistoriaOpen] = useState(false)

  // Open inspection list search
  const [searchOpenVistorias, setSearchOpenVistorias] = useState('')

  useEffect(() => {
    document.title = 'Vistorias & Checklist por Tipo · CREA-PI Fiscalização'
  }, [])

  // 1. Initial load of Tipos, Hospitais, Categorias, Subitens, and Open Vistorias
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [tiposList, hospList, catList, subList, vistoriasList] = await Promise.all([
        tiposEmpreendimentoService.getAll(),
        hospitaisService.getAll(),
        categoriasVistoriaService.getAll(),
        categoriasVistoriaService.getAllSubitens(),
        vistoriasService.getAll(),
      ])
      setTiposEmpreendimento(tiposList)
      setHospitais(hospList)
      setAllCategorias(catList)
      setAllSubitens(subList)
      setAllVistorias(vistoriasList)
      setOpenVistorias(vistoriasList.filter((v) => v.status !== 'concluida'))
    } catch (err) {
      console.error('Erro ao carregar dados de vistoria:', err)
      toast({
        title: 'Erro ao carregar vistoria',
        description: 'Não foi possível carregar os dados do servidor.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // Active Hospital Entity
  const selectedHospital = useMemo(() => {
    return hospitais.find((h) => h.id === selectedHospitalId) || null
  }, [hospitais, selectedHospitalId])

  // Determine the Tipo for the active hospital or selected filter
  const currentHospitalTipo = useMemo(() => {
    if (selectedHospital) {
      return (selectedHospital.tipo || 'Hospital').trim()
    }
    return selectedTipoFiltro !== 'todos' ? selectedTipoFiltro : 'Hospital'
  }, [selectedHospital, selectedTipoFiltro])

  // Categorias (Itens Principais Nível 1) filtered for the active hospital's tipo
  const relevantCategorias = useMemo(() => {
    const isHospital = currentHospitalTipo.toLowerCase() === 'hospital'
    return allCategorias
      .filter((cat) => {
        const catTipo = (cat.tipo || (isHospital ? 'Hospital' : '')).trim()
        return catTipo.toLowerCase() === currentHospitalTipo.toLowerCase()
      })
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
  }, [allCategorias, currentHospitalTipo])

  // Is current vistoria completed / read-only
  const isVistoriaConcluida = useMemo(() => {
    return currentVistoria?.status === 'concluida'
  }, [currentVistoria?.status])

  // Subitens (Nível 2) grouped by Categoria (Nível 1)
  const subitensByCategoria = useMemo(() => {
    const map = new Map<string, SubitemChecklist[]>()
    relevantCategorias.forEach((cat) => {
      let subs = allSubitens.filter((s) => s.categoria === cat.id)
      // Se não há subitem cadastrado na tabela subitens_checklist para esta categoria,
      // cria um fallback virtual usando a própria categoria para manter a tela 100% utilizável
      if (subs.length === 0) {
        subs = [
          {
            id: cat.id,
            categoria: cat.id,
            tipo: cat.tipo,
            ordem: 1,
            codigo: `${cat.ordem || 1}.1`,
            descricao: cat.nome,
            exigeArt: cat.exigeArt ?? true,
            periodicidadeDias: cat.periodicidadeDias,
            created: cat.created,
            updated: cat.updated,
          },
        ]
      } else {
        subs.sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
      }
      map.set(cat.id, subs)
    })
    return map
  }, [relevantCategorias, allSubitens])

  // Flat list of all relevant subitems for computing stats
  const allRelevantSubitens = useMemo(() => {
    const list: SubitemChecklist[] = []
    relevantCategorias.forEach((cat) => {
      const subs = subitensByCategoria.get(cat.id) || []
      list.push(...subs)
    })
    return list
  }, [relevantCategorias, subitensByCategoria])

  // 2. When hospital is selected, load or create its vistoria & items
  const loadVistoriaForHospital = useCallback(
    async (hospId: string, specificVistoriaId?: string | null) => {
      if (!hospId) {
        setCurrentVistoria(null)
        setVistoriaItens([])
        setItemForms({})
        setPendingPhotos({})
        setDeletedPhotos({})
        return
      }

      try {
        setIsLoadingChecklist(true)
        let vistoria: Vistoria | null = null

        if (specificVistoriaId) {
          try {
            vistoria = await vistoriasService.getById(specificVistoriaId)
          } catch {
            // fallback
          }
        }

        if (!vistoria) {
          vistoria = await vistoriasService.getOrCreateForHospital(hospId)
        }

        setCurrentVistoria(vistoria)

        // Load items for this vistoria
        const items = await vistoriasService.getItensByVistoria(vistoria.id)
        setVistoriaItens(items)

        // Initialize form states per subitem (or per category if legacy item)
        const initialForm: Record<string, VistoriaItemFormData> = {}
        items.forEach((item) => {
          const key = item.subitem || item.categoria
          initialForm[key] = {
            possuiSistema: item.possuiSistema || '',
            atividadeRegularizada: item.atividadeRegularizada || '',
            servicoPeriodico: item.servicoPeriodico || '',
            periodicidadeMeses:
              item.periodicidadeMeses !== undefined && item.periodicidadeMeses !== null
                ? item.periodicidadeMeses
                : null,
            prestadorServico: item.prestadorServico || '',
            numeroArt: item.numeroArt || '',
            dataUltimaArt: item.dataUltimaArt ? item.dataUltimaArt.split('T')[0] : '',
            dataUltimaVerificacao: item.dataUltimoServico
              ? item.dataUltimoServico.split('T')[0]
              : item.dataUltimaVerificacao
                ? item.dataUltimaVerificacao.split('T')[0]
                : '',
            dataUltimoServico: item.dataUltimoServico
              ? item.dataUltimoServico.split('T')[0]
              : item.dataUltimaVerificacao
                ? item.dataUltimaVerificacao.split('T')[0]
                : '',
          }
        })
        isInitialLoadRef.current = true
        setItemForms(initialForm)
        setPendingPhotos({})
        setDeletedPhotos({})
        setAutoSaveStatus('idle')

        // Se a vistoria já possui itens preenchidos e não tem atribuição formal,
        // auto-atribui para o usuário atual para garantir consistência no Painel Geral
        if (items.length > 0 && user?.id) {
          atribuicoesService.ensureAssignmentIfUnassigned(hospId, user.id).catch((e) => {
            console.warn('Erro ao garantir atribuição na abertura da vistoria:', e)
          })
        }
      } catch (err) {
        console.error('Erro ao carregar vistoria da unidade:', err)
        toast({
          title: 'Erro ao carregar vistoria',
          description: 'Não foi possível buscar a vistoria e checklist da unidade.',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingChecklist(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    if (selectedHospitalId) {
      loadVistoriaForHospital(selectedHospitalId, urlVistoriaId)
    }
  }, [selectedHospitalId, urlVistoriaId, loadVistoriaForHospital])

  // Handle Hospital Selection dropdown
  const handleSelectHospital = (hospId: string) => {
    setSelectedHospitalId(hospId)
    const newParams: Record<string, string> = {}
    if (hospId) newParams.hospitalId = hospId
    if (selectedTipoFiltro !== 'todos') newParams.tipo = selectedTipoFiltro
    setSearchParams(newParams)
  }

  // Handle Tipo Filter change
  const handleTipoFilterChange = (tipoVal: string) => {
    setSelectedTipoFiltro(tipoVal)
    const newParams: Record<string, string> = {}
    if (tipoVal !== 'todos') newParams.tipo = tipoVal
    if (selectedHospitalId) newParams.hospitalId = selectedHospitalId
    setSearchParams(newParams)
  }

  // Trigger auto-save of a specific subitem when its form changes
  const triggerAutoSaveForSubitem = useCallback(
    (
      subKey: string,
      updatedForm: VistoriaItemFormData,
      targetSub: SubitemChecklist,
      targetCat: CategoriaVistoria,
    ) => {
      if (!currentVistoria || isVistoriaConcluida || !selectedHospitalId) return

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }

      setAutoSaveStatus('saving')

      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          const existingItem = vistoriaItens.find(
            (i) => i.subitem === targetSub.id || (!i.subitem && i.categoria === targetCat.id),
          )
          const newFiles = pendingPhotos[subKey] || []
          const deletedNames = deletedPhotos[subKey] || []
          const metas = pendingPhotosMeta[subKey] || []

          let updatedFotoMetadata = existingItem?.fotoMetadata ? [...existingItem.fotoMetadata] : []
          if (newFiles.length > 0) {
            newFiles.forEach((file, idx) => {
              const meta = metas[idx]
              updatedFotoMetadata.push({
                fileName: file.name,
                latitude: meta?.latitude ?? null,
                longitude: meta?.longitude ?? null,
                dataCaptura: meta?.dataCaptura || new Date().toISOString(),
              })
            })
          }
          if (deletedNames.length > 0) {
            updatedFotoMetadata = updatedFotoMetadata.filter(
              (m) => !deletedNames.includes(m.fileName),
            )
          }

          const payloadWithMeta: VistoriaItemFormData = {
            ...updatedForm,
            fotoMetadata: updatedFotoMetadata,
            latitude: updatedForm.latitude ?? metas[0]?.latitude ?? existingItem?.latitude ?? null,
            longitude:
              updatedForm.longitude ?? metas[0]?.longitude ?? existingItem?.longitude ?? null,
            dataCaptura:
              updatedForm.dataCaptura || metas[0]?.dataCaptura || existingItem?.dataCaptura || null,
          }

          const isRealSubitem = targetSub.id !== targetCat.id
          const saved = await vistoriasService.saveItem(
            currentVistoria.id,
            selectedHospitalId,
            targetCat.id,
            payloadWithMeta,
            {
              exigeArt: targetSub.exigeArt,
              periodicidadeDias: targetSub.periodicidadeDias,
            },
            existingItem?.id,
            newFiles.length > 0 ? newFiles : undefined,
            deletedNames.length > 0 ? deletedNames : undefined,
            isRealSubitem ? targetSub.id : undefined,
            user?.id,
          )

          setVistoriaItens((prev) => {
            const index = prev.findIndex(
              (i) => i.subitem === targetSub.id || (!i.subitem && i.categoria === targetCat.id),
            )
            if (index >= 0) {
              const updated = [...prev]
              updated[index] = saved
              return updated
            }
            return [...prev, saved]
          })

          if (newFiles.length > 0 || deletedNames.length > 0) {
            setPendingPhotos((prev) => ({ ...prev, [subKey]: [] }))
            setPendingPhotosMeta((prev) => ({ ...prev, [subKey]: [] }))
            setDeletedPhotos((prev) => ({ ...prev, [subKey]: [] }))
          }

          setAutoSaveStatus('saved')
          const now = new Date()
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
            now.getMinutes(),
          ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
          setLastSavedTime(timeStr)
        } catch (err) {
          console.error('Erro no salvamento automático do subitem:', err)
          setAutoSaveStatus('error')
        }
      }, 800) // Debounce ~800ms
    },
    [
      currentVistoria,
      isVistoriaConcluida,
      selectedHospitalId,
      vistoriaItens,
      pendingPhotos,
      deletedPhotos,
      pendingPhotosMeta,
    ],
  )

  // Update a form field for a subitem and trigger autosave
  const handleFieldChange = (
    subitemId: string,
    field: keyof VistoriaItemFormData,
    value: any,
    targetSub?: SubitemChecklist,
    targetCat?: CategoriaVistoria,
  ) => {
    if (isVistoriaConcluida) return

    setItemForms((prev) => {
      const current = prev[subitemId] || {}
      let updated: VistoriaItemFormData = {
        ...current,
        [field]: value,
      }

      // Se marcou "Não se aplica" ou "Não" em possuiSistema, limpa os campos condicionais e regularização
      if (field === 'possuiSistema' && (value === 'Não se aplica' || value === 'Não')) {
        updated = {
          ...updated,
          atividadeRegularizada: '',
          prestadorServico: '',
          numeroArt: '',
          dataUltimaArt: '',
          dataUltimaVerificacao: '',
          dataUltimoServico: '',
          servicoPeriodico: '',
          periodicidadeMeses: null,
        }
      }

      // Se marcou regularização como "Não", limpa os campos técnicos condicionais
      if (field === 'atividadeRegularizada' && value === 'Não') {
        updated = {
          ...updated,
          prestadorServico: '',
          numeroArt: '',
          dataUltimaArt: '',
          dataUltimaVerificacao: '',
          dataUltimoServico: '',
          servicoPeriodico: '',
          periodicidadeMeses: null,
        }
      }

      // Sincroniza dataUltimoServico com dataUltimaVerificacao para retrocompatibilidade total
      if (field === 'dataUltimoServico') {
        updated = {
          ...updated,
          dataUltimaVerificacao: value || '',
        }
      }

      if (targetSub && targetCat) {
        triggerAutoSaveForSubitem(subitemId, updated, targetSub, targetCat)
      }

      return {
        ...prev,
        [subitemId]: updated,
      }
    })
  }

  // Add pending photo files with watermarked metadata
  const handleAddPendingPhotos = (
    subitemId: string,
    files: File[],
    metaList?: PhotoCaptureMetadata[],
  ) => {
    setPendingPhotos((prev) => ({
      ...prev,
      [subitemId]: [...(prev[subitemId] || []), ...files],
    }))

    if (metaList && metaList.length > 0) {
      setPendingPhotosMeta((prev) => ({
        ...prev,
        [subitemId]: [...(prev[subitemId] || []), ...metaList],
      }))

      // Atualiza também os campos de localização no form do subitem se tiver coordenadas
      const validMeta = metaList.find((m) => m.latitude !== null && m.longitude !== null)
      if (validMeta) {
        setItemForms((prev) => ({
          ...prev,
          [subitemId]: {
            ...prev[subitemId],
            latitude: validMeta.latitude,
            longitude: validMeta.longitude,
            dataCaptura: validMeta.dataCaptura,
          },
        }))
      }
    }
  }

  // Remove pending photo file
  const handleRemovePendingPhoto = (subitemId: string, index: number) => {
    setPendingPhotos((prev) => {
      const current = [...(prev[subitemId] || [])]
      current.splice(index, 1)
      return { ...prev, [subitemId]: current }
    })
    setPendingPhotosMeta((prev) => {
      const current = [...(prev[subitemId] || [])]
      current.splice(index, 1)
      return { ...prev, [subitemId]: current }
    })
  }

  // Mark existing photo for deletion
  const handleDeleteExistingPhoto = (subitemId: string, filename: string) => {
    setDeletedPhotos((prev) => ({
      ...prev,
      [subitemId]: [...(prev[subitemId] || []), filename],
    }))
    // Also remove from local vistoriaItens display
    setVistoriaItens((prev) =>
      prev.map((item) => {
        const itemKey = item.subitem || item.categoria
        if (itemKey === subitemId && item.fotos) {
          return {
            ...item,
            fotos: item.fotos.filter((f) => f !== filename),
          }
        }
        return item
      }),
    )
  }

  // Save Subitem to Backend
  const handleSaveSubitem = async (sub: SubitemChecklist, cat: CategoriaVistoria) => {
    if (!currentVistoria || !selectedHospitalId) return

    const subKey = sub.id
    const formData = itemForms[subKey] || {
      possuiSistema: '',
      atividadeRegularizada: '',
      servicoPeriodico: '',
      periodicidadeMeses: null,
      prestadorServico: '',
      numeroArt: '',
      dataUltimaArt: '',
      dataUltimaVerificacao: '',
      dataUltimoServico: '',
    }

    const existingItem = vistoriaItens.find(
      (i) => i.subitem === sub.id || (!i.subitem && i.categoria === cat.id),
    )
    const newFiles = pendingPhotos[subKey] || []
    const deletedNames = deletedPhotos[subKey] || []
    const metas = pendingPhotosMeta[subKey] || []

    // Atualiza metadados consolidados se houver novas fotos
    let updatedFotoMetadata = existingItem?.fotoMetadata ? [...existingItem.fotoMetadata] : []
    if (newFiles.length > 0) {
      newFiles.forEach((file, idx) => {
        const meta = metas[idx]
        updatedFotoMetadata.push({
          fileName: file.name,
          latitude: meta?.latitude ?? null,
          longitude: meta?.longitude ?? null,
          dataCaptura: meta?.dataCaptura || new Date().toISOString(),
        })
      })
    }
    if (deletedNames.length > 0) {
      updatedFotoMetadata = updatedFotoMetadata.filter((m) => !deletedNames.includes(m.fileName))
    }

    const payloadWithMeta: VistoriaItemFormData = {
      ...formData,
      fotoMetadata: updatedFotoMetadata,
      latitude: formData.latitude ?? metas[0]?.latitude ?? existingItem?.latitude ?? null,
      longitude: formData.longitude ?? metas[0]?.longitude ?? existingItem?.longitude ?? null,
      dataCaptura:
        formData.dataCaptura || metas[0]?.dataCaptura || existingItem?.dataCaptura || null,
    }

    try {
      setSavingSubitemIds((prev) => ({ ...prev, [subKey]: true }))

      const isRealSubitem = sub.id !== cat.id
      const saved = await vistoriasService.saveItem(
        currentVistoria.id,
        selectedHospitalId,
        cat.id,
        payloadWithMeta,
        {
          exigeArt: sub.exigeArt,
          periodicidadeDias: sub.periodicidadeDias,
        },
        existingItem?.id,
        newFiles.length > 0 ? newFiles : undefined,
        deletedNames.length > 0 ? deletedNames : undefined,
        isRealSubitem ? sub.id : undefined,
        user?.id,
      )

      // Update local items state
      setVistoriaItens((prev) => {
        const index = prev.findIndex(
          (i) => i.subitem === sub.id || (!i.subitem && i.categoria === cat.id),
        )
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = saved
          return updated
        }
        return [...prev, saved]
      })

      // Clear pending/deleted tracking for this subitem
      setPendingPhotos((prev) => ({ ...prev, [subKey]: [] }))
      setPendingPhotosMeta((prev) => ({ ...prev, [subKey]: [] }))
      setDeletedPhotos((prev) => ({ ...prev, [subKey]: [] }))

      toast({
        title: 'Subitem salvo com sucesso!',
        description: `Informações de "${sub.codigo || ''} ${sub.descricao}" foram sincronizadas.`,
      })
    } catch (err) {
      console.error('Erro ao salvar subitem da vistoria:', err)
      toast({
        title: 'Erro ao salvar subitem',
        description: 'Não foi possível salvar os dados da vistoria.',
        variant: 'destructive',
      })
    } finally {
      setSavingSubitemIds((prev) => ({ ...prev, [subKey]: false }))
    }
  }

  // Batch mark all subitems of a categoria (item principal) as "Não se aplica"
  const handleBatchMarkCategoryNaoSeAplica = async (
    cat: CategoriaVistoria,
    subs: SubitemChecklist[],
  ) => {
    if (isVistoriaConcluida || !currentVistoria || !selectedHospitalId || subs.length === 0) return

    // Cancela qualquer timer de autosave pendente
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    setBatchMarkingCatIds((prev) => ({ ...prev, [cat.id]: true }))
    setAutoSaveStatus('saving')

    // 1. Atualiza imediatamente o estado de formulário local (itemForms) de todos os subitens
    // Limpando campos condicionais (prestador, ART, datas, periodicidade)
    const updatedFormMap: Record<string, VistoriaItemFormData> = {}
    setItemForms((prev) => {
      const next = { ...prev }
      subs.forEach((sub) => {
        const current = next[sub.id] || {}
        const updated: VistoriaItemFormData = {
          ...current,
          possuiSistema: 'Não se aplica',
          atividadeRegularizada: '',
          prestadorServico: '',
          numeroArt: '',
          dataUltimaArt: '',
          dataUltimaVerificacao: '',
          dataUltimoServico: '',
          servicoPeriodico: '',
          periodicidadeMeses: null,
        }
        next[sub.id] = updated
        updatedFormMap[sub.id] = updated
      })
      return next
    })

    // 2. Persiste todos os subitens no backend via vistoriasService.saveItem
    try {
      const savePromises = subs.map(async (sub) => {
        const subKey = sub.id
        const formPayload = updatedFormMap[subKey] || {
          possuiSistema: 'Não se aplica',
          atividadeRegularizada: '',
          prestadorServico: '',
          numeroArt: '',
          dataUltimaArt: '',
          dataUltimaVerificacao: '',
          dataUltimoServico: '',
          servicoPeriodico: '',
          periodicidadeMeses: null,
        }
        const existingItem = vistoriaItens.find(
          (i) => i.subitem === sub.id || (!i.subitem && i.categoria === cat.id),
        )
        const isRealSubitem = sub.id !== cat.id

        return await vistoriasService.saveItem(
          currentVistoria.id,
          selectedHospitalId,
          cat.id,
          formPayload,
          {
            exigeArt: sub.exigeArt,
            periodicidadeDias: sub.periodicidadeDias,
          },
          existingItem?.id,
          undefined,
          undefined,
          isRealSubitem ? sub.id : undefined,
          user?.id,
        )
      })

      const savedRecords = await Promise.all(savePromises)

      // Atualiza lista local de vistoriaItens com os registros retornados
      setVistoriaItens((prev) => {
        const next = [...prev]
        savedRecords.forEach((saved) => {
          const idx = next.findIndex(
            (i) =>
              (saved.subitem && i.subitem === saved.subitem) ||
              (!saved.subitem && !i.subitem && i.categoria === saved.categoria),
          )
          if (idx >= 0) {
            next[idx] = saved
          } else {
            next.push(saved)
          }
        })
        return next
      })

      setAutoSaveStatus('saved')
      const now = new Date()
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes(),
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      setLastSavedTime(timeStr)

      toast({
        title: 'Item marcado como "Não se aplica"',
        description: `Todos os ${subs.length} subitens de "${cat.nome}" foram marcados como Não se aplica.`,
      })
    } catch (err) {
      console.error('Erro ao marcar subitens em lote como Não se aplica:', err)
      setAutoSaveStatus('error')
      toast({
        title: 'Erro ao marcar item',
        description: 'Não foi possível salvar as alterações em lote.',
        variant: 'destructive',
      })
    } finally {
      setBatchMarkingCatIds((prev) => ({ ...prev, [cat.id]: false }))
    }
  }

  // Calculate situation summary for the active vistoria based on SUBITENS
  const stats = useMemo(() => {
    let conformeCount = 0
    let naoConformeCount = 0
    let vencidoCount = 0
    let vencendoEmBreveCount = 0
    let naoSeAplicaCount = 0
    let pendenteCount = 0

    allRelevantSubitens.forEach((sub) => {
      const item = vistoriaItens.find(
        (i) => i.subitem === sub.id || (!i.subitem && i.categoria === sub.categoria),
      )
      const form = itemForms[sub.id]

      let situacao: SituacaoChecklist = null

      if (form) {
        situacao = calculateItemSituacao(form, sub)
      } else if (item) {
        situacao = item.situacaoCalculada || null
      }

      if (situacao === 'conforme') conformeCount++
      else if (situacao === 'nao_conforme') naoConformeCount++
      else if (situacao === 'vencido') vencidoCount++
      else if (situacao === 'vencendo_em_breve') vencendoEmBreveCount++
      else if (situacao === 'não se aplica') naoSeAplicaCount++
      else pendenteCount++
    })

    return {
      total: allRelevantSubitens.length,
      conforme: conformeCount,
      naoConforme: naoConformeCount,
      vencido: vencidoCount,
      vencendoEmBreve: vencendoEmBreveCount,
      naoSeAplica: naoSeAplicaCount,
      pendente: pendenteCount,
    }
  }, [allRelevantSubitens, vistoriaItens, itemForms])

  // Filter vistorias for the list view by Tipo and Search (includes all, displaying their status badges)
  const filteredOpenVistorias = useMemo(() => {
    const sourceList = allVistorias.length > 0 ? allVistorias : openVistorias
    return sourceList.filter((v) => {
      const hospTipo = (v.expand?.hospital?.tipo || 'Hospital').trim().toLowerCase()
      const matchTipo =
        selectedTipoFiltro === 'todos' || hospTipo === selectedTipoFiltro.trim().toLowerCase()

      if (!matchTipo) return false

      if (!searchOpenVistorias.trim()) return true
      const q = searchOpenVistorias.toLowerCase()
      return (
        v.expand?.hospital?.nome?.toLowerCase().includes(q) ||
        v.expand?.hospital?.municipio?.toLowerCase().includes(q) ||
        v.expand?.hospital?.cnes?.includes(q)
      )
    })
  }, [allVistorias, openVistorias, selectedTipoFiltro, searchOpenVistorias])

  // Hospitais list for the selection dropdown (filtered by selectedTipoFiltro if active)
  const selectableHospitais = useMemo(() => {
    if (selectedTipoFiltro === 'todos') return hospitais
    return hospitais.filter((h) => {
      const t = (h.tipo || 'Hospital').trim().toLowerCase()
      return t === selectedTipoFiltro.trim().toLowerCase()
    })
  }, [hospitais, selectedTipoFiltro])

  // Total photos count across the current vistoria items
  const totalPhotosInCurrentVistoria = useMemo(() => {
    return vistoriaItens.reduce((acc, item) => acc + (item.fotos?.length || 0), 0)
  }, [vistoriaItens])

  // Finalizar Vistoria
  const handleFinalizarVistoria = async () => {
    if (!currentVistoria) return
    try {
      setIsFinalizando(true)
      const updated = await vistoriasService.updateStatus(currentVistoria.id, 'concluida')
      setCurrentVistoria(updated)
      setIsFinalizarDialogOpen(false)
      toast({
        title: 'Vistoria finalizada com sucesso!',
        description:
          'A vistoria foi marcada como concluída e o checklist está travado para edição.',
      })
      await loadInitialData()
    } catch (err) {
      console.error('Erro ao finalizar vistoria:', err)
      toast({
        title: 'Erro ao finalizar vistoria',
        description: 'Não foi possível alterar o status da vistoria.',
        variant: 'destructive',
      })
    } finally {
      setIsFinalizando(false)
    }
  }

  // Reabrir Vistoria
  const handleReabrirVistoria = async () => {
    if (!currentVistoria) return
    try {
      setIsReabrindo(true)
      const updated = await vistoriasService.updateStatus(currentVistoria.id, 'em_andamento')
      setCurrentVistoria(updated)
      toast({
        title: 'Vistoria reaberta!',
        description: 'A edição do checklist foi liberada novamente.',
      })
      await loadInitialData()
    } catch (err) {
      console.error('Erro ao reabrir vistoria:', err)
      toast({
        title: 'Erro ao reabrir vistoria',
        description: 'Não foi possível reabrir a vistoria.',
        variant: 'destructive',
      })
    } finally {
      setIsReabrindo(false)
    }
  }

  // 1. Geração de Relatório em PDF na tela da vistoria específica
  const handleGeneratePdf = async () => {
    if (!currentVistoria) {
      toast({
        title: 'Nenhuma vistoria selecionada',
        description: 'Selecione uma vistoria para gerar o relatório.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsGeneratingPdf(true)
      setPdfProgressText('Iniciando geração do documento...')

      const fileName = await generateVistoriaPdf({
        vistoria: currentVistoria,
        hospital: selectedHospital,
        responsavelNome: user?.name || 'Fiscal CREA-PI',
        vistoriaItens,
        categorias: relevantCategorias,
        subitens: allRelevantSubitens,
        onProgress: (msg) => setPdfProgressText(msg),
      })

      toast({
        title: 'Relatório gerado com sucesso!',
        description: `O arquivo ${fileName} foi baixado no seu dispositivo.`,
      })
    } catch (err) {
      console.error('Erro ao gerar relatório PDF:', err)
      toast({
        title: 'Erro ao gerar relatório',
        description: 'Não foi possível compilar o documento em PDF.',
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingPdf(false)
      setPdfProgressText('')
    }
  }

  // 2. Geração de Relatório em PDF a partir de um Card na listagem geral
  const handleGeneratePdfForVistoriaCard = async (v: Vistoria) => {
    try {
      setGeneratingCardPdfId(v.id)
      toast({
        title: 'Preparando relatório da vistoria...',
        description: 'Carregando dados completos do checklist e anexos fotográficos.',
      })

      // Carrega itens daquela vistoria específica
      const items = await vistoriasService.getItensByVistoria(v.id)
      const hosp = v.expand?.hospital || hospitais.find((h) => h.id === v.hospital) || null
      const hospTipo = (hosp?.tipo || 'Hospital').trim().toLowerCase()

      const relevantCats = allCategorias
        .filter((cat) => {
          const catTipo = (cat.tipo || 'Hospital').trim().toLowerCase()
          return catTipo === hospTipo
        })
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))

      const relevantSubs = allSubitens.filter((sub) =>
        relevantCats.some((cat) => cat.id === sub.categoria),
      )

      const fileName = await generateVistoriaPdf({
        vistoria: v,
        hospital: hosp,
        responsavelNome: user?.name || 'Fiscal CREA-PI',
        vistoriaItens: items,
        categorias: relevantCats,
        subitens: relevantSubs,
      })

      toast({
        title: 'Relatório PDF gerado!',
        description: `Download concluído: ${fileName}`,
      })
    } catch (err) {
      console.error('Erro ao gerar relatório a partir do card:', err)
      toast({
        title: 'Erro ao gerar relatório',
        description: 'Não foi possível gerar o relatório PDF desta vistoria.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingCardPdfId(null)
    }
  }

  // 3. Download de todas as fotos da vistoria em ZIP
  const handleDownloadAllPhotosZip = async () => {
    if (!currentVistoria) return
    if (totalPhotosInCurrentVistoria === 0) {
      toast({
        title: 'Nenhuma foto anexada',
        description: 'Esta vistoria ainda não possui registros fotográficos para download.',
      })
      return
    }

    try {
      setIsDownloadingZip(true)
      setZipProgressText(`Compactando fotos (0/${totalPhotosInCurrentVistoria})...`)

      const result = await downloadAllVistoriaPhotosZip({
        vistoriaId: currentVistoria.id,
        hospital: selectedHospital,
        vistoriaItens,
        categorias: relevantCategorias,
        subitens: allRelevantSubitens,
        onProgress: (current, total) => {
          setZipProgressText(`Compactando fotos (${current}/${total})...`)
        },
      })

      if (result.count === 0) {
        toast({
          title: 'Nenhuma foto disponível',
          description: 'Não foram encontradas fotos salvas para download.',
        })
      } else {
        toast({
          title: 'Download de fotos concluído!',
          description: `Arquivo ZIP gerado com ${result.count} fotos com coordenadas e data/hora.`,
        })
      }
    } catch (err) {
      console.error('Erro ao baixar fotos em ZIP:', err)
      toast({
        title: 'Erro ao gerar arquivo ZIP',
        description: 'Não foi possível compactar as fotos da vistoria.',
        variant: 'destructive',
      })
    } finally {
      setIsDownloadingZip(false)
      setZipProgressText('')
    }
  }

  return (
    <div className="animate-page-enter space-y-8 pb-20">
      {/* 1. Header with Nova Vistoria button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D3DFE9] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] sm:text-[28px] font-bold text-[#102A43] tracking-tight leading-tight">
              Vistorias & Checklist por Tipo
            </h1>
          </div>
          <p className="text-sm text-[#486581] mt-0.5">
            Checklist técnico em dois níveis: temas principais como agrupadores e fiscalização
            detalhada por subitem
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <Button
            onClick={() => setIsNovaVistoriaOpen(true)}
            className="bg-[#004B8D] hover:bg-[#003666] text-white shadow-sm font-semibold h-10 px-4 cursor-pointer gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Iniciar Fiscalização
          </Button>
          <Button
            variant="outline"
            onClick={loadInitialData}
            disabled={isLoading}
            className="border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8] font-semibold h-10 px-3 cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 2. Filtro por Tipo de Empreendimento + Seleção da Unidade */}
      <div className="bg-white rounded-2xl border border-[#D3DFE9] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-5">
        {/* Tipo Selector Chips / Dropdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-[#102A43] flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-[#004B8D]" />
              Segmento de Fiscalização:
            </Label>
            {selectedTipoFiltro !== 'todos' && (
              <span className="text-xs text-[#004B8D] font-bold">
                Exibindo apenas: {selectedTipoFiltro}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleTipoFilterChange('todos')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedTipoFiltro === 'todos'
                  ? 'bg-[#004B8D] text-white shadow-xs'
                  : 'bg-[#F4F6F9] text-[#486581] hover:bg-[#E8F1F8] border border-[#D3DFE9]'
              }`}
            >
              Todos os Tipos ({openVistorias.length} vistorias)
            </button>

            {tiposEmpreendimento.map((t) => {
              const isSelected = selectedTipoFiltro.toLowerCase() === t.nome.toLowerCase()
              const Icon = getIconComponent(t.icone)
              const vCount = openVistorias.filter((v) => {
                const hTipo = (v.expand?.hospital?.tipo || 'Hospital').trim().toLowerCase()
                return hTipo === t.nome.trim().toLowerCase()
              }).length

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTipoFilterChange(t.nome)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#004B8D] text-white shadow-xs'
                      : 'bg-[#F4F6F9] text-[#486581] hover:bg-[#E8F1F8] border border-[#D3DFE9]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#004B8D]'}`} />
                  <span>{t.nome}</span>
                  {vCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#004B8D]/10 text-[#004B8D]'
                      }`}
                    >
                      {vCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Seleção do Estabelecimento */}
        <div className="pt-3 border-t border-[#D3DFE9]/70 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Label
              htmlFor="select-hospital"
              className="text-sm font-bold text-[#102A43] flex items-center gap-2"
            >
              <Building2 className="w-4 h-4 text-[#004B8D]" />
              Selecione a Unidade para Vistoriar / Preencher Checklist:
            </Label>

            {selectedHospital && (
              <Badge className="bg-[#E8F1F8] text-[#004B8D] hover:bg-[#E8F1F8] text-xs font-semibold self-start sm:self-auto border-0 gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {selectedHospital.tipo || 'Hospital'} • CNES: {selectedHospital.cnes}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Select value={selectedHospitalId} onValueChange={handleSelectHospital}>
                <SelectTrigger
                  id="select-hospital"
                  className="h-11 border-[#D3DFE9] bg-[#F4F6F9]/50 text-sm focus:ring-[#004B8D]"
                >
                  <SelectValue
                    placeholder={
                      selectedTipoFiltro === 'todos'
                        ? 'Selecione uma unidade cadastrada...'
                        : `Selecione uma unidade de ${selectedTipoFiltro}...`
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {selectableHospitais.length === 0 ? (
                    <div className="p-3 text-xs text-center text-[#627D98]">
                      Nenhuma unidade cadastrada neste tipo.
                    </div>
                  ) : (
                    selectableHospitais.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#102A43]">{h.nome}</span>
                          <span className="text-xs text-[#627D98]">
                            ({h.municipio} • CNES: {h.cnes} • {h.tipo || 'Hospital'})
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedHospitalId && (
              <Button
                variant="outline"
                onClick={() => handleSelectHospital('')}
                className="border-[#D3DFE9] text-[#486581] hover:text-[#102A43] h-11 text-xs gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
                Limpar seleção de unidade
              </Button>
            )}
          </div>

          {/* Selected Hospital Info Card */}
          {selectedHospital && (
            <div className="mt-2 p-4 rounded-xl bg-[#F4F6F9] border border-[#D3DFE9] grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[#627D98] block">Segmento:</span>
                <span className="font-bold text-[#004B8D]">
                  {selectedHospital.tipo || 'Hospital'}
                </span>
              </div>
              <div>
                <span className="text-[#627D98] block">Município:</span>
                <span className="font-semibold text-[#102A43]">{selectedHospital.municipio}</span>
              </div>
              <div>
                <span className="text-[#627D98] block">CNPJ:</span>
                <span className="font-mono text-[#102A43]">
                  {selectedHospital.cnpj ? formatCNPJ(selectedHospital.cnpj) : 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-[#627D98] block">Responsável:</span>
                <span className="font-semibold text-[#102A43]">
                  {selectedHospital.responsavel || 'Não informado'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Resumo Técnico da Vistoria (Card no Topo) calculado a nível de subitem */}
      {selectedHospitalId && (
        <div className="bg-white rounded-2xl border border-[#D3DFE9] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#D3DFE9] pb-3 gap-3">
            <div>
              <h3 className="text-base font-bold text-[#102A43] flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[#004B8D]" />
                Resumo da Fiscalização: {selectedHospital?.tipo || 'Hospital'}
              </h3>
              <span className="text-xs text-[#627D98] font-medium">
                {stats.total} {stats.total === 1 ? 'subitem fiscalizado' : 'subitens fiscalizados'}{' '}
                em {relevantCategorias.length} {relevantCategorias.length === 1 ? 'tema' : 'temas'}
              </span>
            </div>

            {/* Ações Rápidas: Gerar Relatório PDF + Baixar Todas as Fotos + Finalizar / Reabrir */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Botão Finalizar / Reabrir Vistoria */}
              {isVistoriaConcluida ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isReabrindo}
                  onClick={handleReabrirVistoria}
                  className="border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 font-bold text-xs h-9 px-3.5 gap-1.5 cursor-pointer shadow-xs"
                  title="Reabrir vistoria para permitir novas edições"
                >
                  {isReabrindo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Unlock className="w-4 h-4 text-amber-700" />
                  )}
                  <span>Reabrir Vistoria</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => setIsFinalizarDialogOpen(true)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-9 px-3.5 gap-1.5 cursor-pointer shadow-xs"
                  title="Finalizar vistoria e travar checklist"
                >
                  <Lock className="w-4 h-4" />
                  <span>Finalizar Vistoria</span>
                </Button>
              )}

              <Button
                type="button"
                disabled={isGeneratingPdf}
                onClick={handleGeneratePdf}
                variant="outline"
                className="border-[#004B8D] text-[#004B8D] hover:bg-[#E8F1F8] font-bold text-xs h-9 px-3.5 gap-2 cursor-pointer shadow-xs"
                title="Gerar e baixar relatório técnico oficial em PDF com cabeçalho CREA-PI"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{pdfProgressText || 'Gerando PDF...'}</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 stroke-[2.2]" />
                    <span>Gerar Relatório (PDF)</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={isDownloadingZip || totalPhotosInCurrentVistoria === 0}
                onClick={handleDownloadAllPhotosZip}
                className="border-[#004B8D]/30 text-[#004B8D] hover:bg-[#E8F1F8] font-bold text-xs h-9 px-3.5 gap-2 cursor-pointer"
                title="Baixar todas as fotos da vistoria em um arquivo ZIP com marcas d'água de GPS e data/hora"
              >
                {isDownloadingZip ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{zipProgressText || 'Compactando...'}</span>
                  </>
                ) : (
                  <>
                    <FolderArchive className="w-4 h-4" />
                    <span>Baixar Todas as Fotos ({totalPhotosInCurrentVistoria})</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Banner de Vistoria Concluída / Travada */}
          {isVistoriaConcluida && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-3 text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <strong className="font-bold">Vistoria Concluída (Modo Somente Leitura):</strong>
                  <span className="ml-1 text-emerald-800">
                    O checklist desta vistoria está finalizado e travado contra alterações
                    acidentais. Para fazer correções, utilize o botão &ldquo;Reabrir
                    Vistoria&rdquo;.
                  </span>
                </div>
              </div>
              <Badge className="bg-emerald-600 text-white font-bold text-[11px] shrink-0">
                Concluída
              </Badge>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Conforme
              </div>
              <div className="text-2xl font-bold text-emerald-900">{stats.conforme}</div>
              <div className="text-[11px] text-emerald-700">Subitens regulares</div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300">
              <div className="flex items-center gap-1.5 text-rose-800 text-xs font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Não conforme
              </div>
              <div className="text-2xl font-bold text-rose-900">{stats.naoConforme}</div>
              <div className="text-[11px] text-rose-700">Não regularizados</div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
              <div className="flex items-center gap-1.5 text-rose-800 text-xs font-bold mb-1">
                <Clock className="w-4 h-4 text-rose-600" />
                Vencido
              </div>
              <div className="text-2xl font-bold text-rose-900">{stats.vencido}</div>
              <div className="text-[11px] text-rose-700">Prazo expirado</div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300">
              <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold mb-1">
                <Clock className="w-4 h-4 text-amber-600" />
                Vencendo
              </div>
              <div className="text-2xl font-bold text-amber-900">{stats.vencendoEmBreve}</div>
              <div className="text-[11px] text-amber-700">Vence em até 30 dias</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-[#D3DFE9]">
              <div className="flex items-center gap-1.5 text-[#486581] text-xs font-bold mb-1">
                <CheckCircle className="w-4 h-4 text-[#627D98]" />
                Não se aplica
              </div>
              <div className="text-2xl font-bold text-[#102A43]">{stats.naoSeAplica}</div>
              <div className="text-[11px] text-[#627D98]">Não possui atividade</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-100/70 border border-slate-300">
              <div className="flex items-center gap-1.5 text-[#486581] text-xs font-bold mb-1">
                <Clock className="w-4 h-4 text-[#627D98]" />
                Pendente
              </div>
              <div className="text-2xl font-bold text-[#102A43]">{stats.pendente}</div>
              <div className="text-[11px] text-[#627D98]">Não respondido</div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Checklist Agrupado em 2 Níveis: Itens Principais (Accordion) + Subitens (Cards com perguntas) */}
      {selectedHospitalId ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#102A43] flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-[#004B8D]" />
                Checklist Específico: {selectedHospital?.tipo || 'Hospital'}
              </h2>
              <p className="text-xs text-[#486581]">
                Abra cada tema principal abaixo para preencher os subitens de fiscalização (marcação
                de serviço, ART e fotos).
              </p>
            </div>

            {isLoadingChecklist && (
              <div className="flex items-center gap-1.5 text-xs text-[#004B8D] font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando checklist...
              </div>
            )}
          </div>

          {relevantCategorias.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-[#D3DFE9] space-y-3">
              <FileCheck2 className="w-10 h-10 text-[#829AB1] mx-auto stroke-[1.5]" />
              <h4 className="text-sm font-bold text-[#102A43]">
                Checklist de {selectedHospital?.tipo || 'este segmento'} está vazio
              </h4>
              <p className="text-xs text-[#486581] max-w-md mx-auto">
                Este tipo de empreendimento ainda não possui temas ou subitens de checklist
                cadastrados. Acesse a página do tipo para cadastrar ou importar via planilha CSV.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const t = tiposEmpreendimento.find(
                    (item) =>
                      item.nome.toLowerCase() === (selectedHospital?.tipo || '').toLowerCase(),
                  )
                  if (t) navigate(`/tipos-empreendimento/${t.id}`)
                  else navigate('/tipos-empreendimento')
                }}
                className="text-xs border-[#004B8D]/30 text-[#004B8D] hover:bg-[#E8F1F8] mt-2 cursor-pointer"
              >
                Gerenciar Checklist deste Tipo
              </Button>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-3.5">
              {relevantCategorias.map((cat, idx) => {
                const itemNumber = cat.ordem || idx + 1
                const subs = subitensByCategoria.get(cat.id) || []

                // Contar pendências / status do tema principal
                let temaConforme = 0
                let temaNaoConforme = 0
                let temaVencido = 0
                let temaNaoSeAplica = 0
                let temaPendente = 0

                subs.forEach((sub) => {
                  const item = vistoriaItens.find(
                    (i) => i.subitem === sub.id || (!i.subitem && i.categoria === cat.id),
                  )
                  const form = itemForms[sub.id]
                  let s: SituacaoChecklist = null
                  if (form) s = calculateItemSituacao(form, sub)
                  else if (item) s = item.situacaoCalculada || null

                  if (s === 'conforme') temaConforme++
                  else if (s === 'nao_conforme') temaNaoConforme++
                  else if (s === 'vencido') temaVencido++
                  else if (s === 'não se aplica') temaNaoSeAplica++
                  else temaPendente++
                })

                return (
                  <AccordionItem
                    key={cat.id}
                    value={cat.id}
                    className="border border-[#D3DFE9] bg-white rounded-xl overflow-hidden shadow-xs data-[state=open]:border-[#004B8D]/60 transition-all"
                  >
                    {/* ACCORDION HEADER: ITEM PRINCIPAL (NÍVEL 1) */}
                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-slate-50/70">
                      <div className="flex flex-1 items-center justify-between gap-4 text-left pr-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-[#004B8D] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {itemNumber}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm sm:text-base text-[#102A43] truncate">
                              {cat.nome}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#627D98] mt-0.5">
                              <span>
                                {subs.length} {subs.length === 1 ? 'subitem' : 'subitens'} de
                                fiscalização
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Ações e Badges de situação agregadas no Tema */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Botão Não se aplica em lote para o item principal */}
                          {!isVistoriaConcluida && subs.length > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={batchMarkingCatIds[cat.id]}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleBatchMarkCategoryNaoSeAplica(cat, subs)
                              }}
                              className="h-7 px-2.5 text-xs font-bold border-orange-300 text-orange-700 bg-orange-50/70 hover:bg-orange-100 hover:text-orange-800 hover:border-orange-400 transition-colors cursor-pointer shadow-2xs"
                              title="Marcar todos os subitens deste item como Não se aplica"
                            >
                              {batchMarkingCatIds[cat.id] ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-1 text-orange-600" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 mr-1 text-orange-600" />
                              )}
                              Não se aplica
                            </Button>
                          )}

                          {temaNaoConforme > 0 && (
                            <Badge className="bg-rose-50 text-rose-800 border border-rose-300 text-[11px] font-bold gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              {temaNaoConforme} não conforme(s)
                            </Badge>
                          )}
                          {temaVencido > 0 && (
                            <Badge className="bg-rose-50 text-rose-800 border border-rose-300 text-[11px] font-bold gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              {temaVencido} vencido(s)
                            </Badge>
                          )}
                          {temaPendente > 0 && (
                            <Badge className="bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-medium gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {temaPendente} pendente(s)
                            </Badge>
                          )}
                          {temaNaoConforme === 0 &&
                            temaVencido === 0 &&
                            temaPendente === 0 &&
                            temaConforme > 0 && (
                              <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-bold gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Conforme
                              </Badge>
                            )}
                          {temaNaoConforme === 0 &&
                            temaVencido === 0 &&
                            temaPendente === 0 &&
                            temaConforme === 0 &&
                            temaNaoSeAplica > 0 && (
                              <Badge className="bg-slate-100 text-[#486581] border border-[#D3DFE9] text-[11px] font-medium">
                                Não se aplica
                              </Badge>
                            )}
                        </div>
                      </div>
                    </AccordionTrigger>

                    {/* ACCORDION CONTENT: LISTA DE SUBITENS (NÍVEL 2) */}
                    <AccordionContent className="px-4 sm:px-6 pb-6 pt-3 border-t border-[#D3DFE9]/70 bg-slate-50/40 space-y-4">
                      {subs.map((sub, sIdx) => {
                        const subKey = sub.id
                        const item = vistoriaItens.find(
                          (i) => i.subitem === sub.id || (!i.subitem && i.categoria === cat.id),
                        )
                        const form = itemForms[subKey] || {
                          possuiSistema: '',
                          servicoPeriodico: '',
                          periodicidadeMeses: null,
                          prestadorServico: '',
                          numeroArt: '',
                          dataUltimaArt: '',
                          dataUltimaVerificacao: '',
                          dataUltimoServico: '',
                        }

                        const situacao = calculateItemSituacao(form, sub)
                        const isSaving = savingSubitemIds[subKey] || false
                        const pending = pendingPhotos[subKey] || []
                        const subCode = sub.codigo || `${itemNumber}.${sIdx + 1}`

                        return (
                          <div
                            key={sub.id}
                            className="bg-white rounded-xl border border-[#D3DFE9] p-4 sm:p-5 shadow-xs space-y-4 hover:border-[#004B8D]/30 transition-colors"
                          >
                            {/* Subitem Title + Metadata Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#D3DFE9]/70 pb-3">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-[#004B8D] bg-[#E8F1F8] px-2.5 py-0.5 rounded-md border border-[#004B8D]/20">
                                    {subCode}
                                  </span>
                                  <h5 className="font-bold text-sm text-[#102A43] leading-snug">
                                    {sub.descricao}
                                  </h5>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#627D98] pt-0.5">
                                  <span className="flex items-center gap-1">
                                    Exige ART:{' '}
                                    <strong
                                      className={sub.exigeArt ? 'text-[#004B8D]' : 'text-[#627D98]'}
                                    >
                                      {sub.exigeArt ? 'Sim' : 'Não'}
                                    </strong>
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    Periodicidade:{' '}
                                    {sub.periodicidadeDias && sub.periodicidadeDias > 0 ? (
                                      <strong className="text-[#102A43]">
                                        {sub.periodicidadeDias} dias
                                      </strong>
                                    ) : (
                                      <span className="text-[#829AB1] italic">
                                        Sem periodicidade fixa
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                              {/* Status Badge */}
                              <div className="shrink-0 self-start sm:self-auto flex items-center gap-1.5">
                                {situacao === 'conforme' && (
                                  <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Conforme
                                  </Badge>
                                )}
                                {situacao === 'nao_conforme' && (
                                  <Badge className="bg-rose-50 text-rose-800 border border-rose-300 text-xs font-bold gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                    Não conforme
                                  </Badge>
                                )}
                                {situacao === 'vencendo_em_breve' && (
                                  <Badge className="bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold gap-1">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    Vencendo em breve
                                  </Badge>
                                )}
                                {situacao === 'vencido' && (
                                  <Badge className="bg-rose-50 text-rose-800 border border-rose-300 text-xs font-bold gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                    Vencido
                                  </Badge>
                                )}
                                {situacao === 'não se aplica' && (
                                  <Badge className="bg-slate-100 text-[#486581] border border-[#D3DFE9] text-xs font-medium">
                                    Não se aplica
                                  </Badge>
                                )}
                                {!situacao && (
                                  <Badge className="bg-slate-100 text-[#486581] border border-[#D3DFE9] text-xs font-medium gap-1">
                                    <Clock className="w-3 h-3 text-[#627D98]" />
                                    Pendente
                                  </Badge>
                                )}
                              </div>{' '}
                            </div>

                            {/* 1. Possui o serviço / sistema? */}
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-[#102A43]">
                                O estabelecimento possui esta atividade / sistema?{' '}
                                <span className="text-rose-600">*</span>
                              </Label>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isVistoriaConcluida}
                                  variant={form.possuiSistema === 'Sim' ? 'default' : 'outline'}
                                  onClick={() =>
                                    handleFieldChange(subKey, 'possuiSistema', 'Sim', sub, cat)
                                  }
                                  className={`h-8 px-4 text-xs font-bold cursor-pointer ${
                                    form.possuiSistema === 'Sim'
                                      ? 'bg-[#004B8D] text-white'
                                      : 'border-[#D3DFE9] text-[#486581]'
                                  } ${isVistoriaConcluida ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  Sim
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isVistoriaConcluida}
                                  variant={form.possuiSistema === 'Não' ? 'default' : 'outline'}
                                  onClick={() =>
                                    handleFieldChange(subKey, 'possuiSistema', 'Não', sub, cat)
                                  }
                                  className={`h-8 px-4 text-xs font-bold cursor-pointer ${
                                    form.possuiSistema === 'Não'
                                      ? 'bg-slate-700 text-white'
                                      : 'border-[#D3DFE9] text-[#486581]'
                                  } ${isVistoriaConcluida ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  Não
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isVistoriaConcluida}
                                  variant={
                                    form.possuiSistema === 'Não se aplica' ? 'default' : 'outline'
                                  }
                                  onClick={() =>
                                    handleFieldChange(
                                      subKey,
                                      'possuiSistema',
                                      'Não se aplica',
                                      sub,
                                      cat,
                                    )
                                  }
                                  className={`h-8 px-3.5 text-xs font-bold cursor-pointer ${
                                    form.possuiSistema === 'Não se aplica'
                                      ? 'bg-[#486581] text-white'
                                      : 'border-[#D3DFE9] text-[#486581] hover:bg-[#F4F6F9]'
                                  } ${isVistoriaConcluida ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  Não se aplica
                                </Button>
                              </div>
                            </div>

                            {/* 2. Pergunta condicional de Regularização (quando possui atividade / sistema = "Sim") */}
                            {form.possuiSistema === 'Sim' && (
                              <div className="space-y-1.5 pt-1">
                                <Label className="text-xs font-bold text-[#102A43]">
                                  A atividade está regularizada?{' '}
                                  <span className="text-rose-600">*</span>
                                </Label>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={isVistoriaConcluida}
                                    variant={
                                      form.atividadeRegularizada === 'Sim' ||
                                      (!form.atividadeRegularizada && !form.atividadeRegularizada) // Mantém compatibilidade visual se vazio
                                        ? form.atividadeRegularizada === 'Sim'
                                          ? 'default'
                                          : 'outline'
                                        : 'outline'
                                    }
                                    onClick={() =>
                                      handleFieldChange(
                                        subKey,
                                        'atividadeRegularizada',
                                        'Sim',
                                        sub,
                                        cat,
                                      )
                                    }
                                    className={`h-8 px-4 text-xs font-bold cursor-pointer ${
                                      form.atividadeRegularizada === 'Sim'
                                        ? 'bg-[#004B8D] text-white'
                                        : 'border-[#D3DFE9] text-[#486581]'
                                    } ${isVistoriaConcluida ? 'opacity-70 cursor-not-allowed' : ''}`}
                                  >
                                    Sim
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={isVistoriaConcluida}
                                    variant={
                                      form.atividadeRegularizada === 'Não' ? 'default' : 'outline'
                                    }
                                    onClick={() =>
                                      handleFieldChange(
                                        subKey,
                                        'atividadeRegularizada',
                                        'Não',
                                        sub,
                                        cat,
                                      )
                                    }
                                    className={`h-8 px-4 text-xs font-bold cursor-pointer ${
                                      form.atividadeRegularizada === 'Não'
                                        ? 'bg-rose-700 hover:bg-rose-800 text-white'
                                        : 'border-[#D3DFE9] text-[#486581]'
                                    } ${isVistoriaConcluida ? 'opacity-70 cursor-not-allowed' : ''}`}
                                  >
                                    Não
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Conditional Form Fields if "Sim" no possuiSistema E (atividadeRegularizada === 'Sim' ou vazio para dados existentes) */}
                            {form.possuiSistema === 'Sim' &&
                              form.atividadeRegularizada !== 'Não' && (
                                <div className="p-4 rounded-xl bg-[#F4F6F9]/70 border border-[#D3DFE9] space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {/* Prestador do Serviço */}
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-bold text-[#102A43]">
                                        Prestador do Serviço / Empresa Mantenedora
                                      </Label>
                                      <Input
                                        placeholder="Ex: Empresa de Engenharia Ltda"
                                        disabled={isVistoriaConcluida}
                                        value={form.prestadorServico || ''}
                                        onChange={(e) =>
                                          handleFieldChange(
                                            subKey,
                                            'prestadorServico',
                                            e.target.value,
                                            sub,
                                            cat,
                                          )
                                        }
                                        className="border-[#D3DFE9] bg-white text-xs h-9 disabled:bg-slate-100 disabled:opacity-80"
                                      />
                                    </div>

                                    {/* Número da ART */}
                                    <div className="space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-[#102A43]">
                                          Número da ART (CREA)
                                        </Label>
                                        {sub.exigeArt ? (
                                          <span className="text-[10px] text-[#004B8D] font-bold bg-[#E8F1F8] px-1.5 py-0.5 rounded border border-[#004B8D]/20">
                                            Exigida
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-[#627D98] bg-white px-1.5 py-0.5 rounded border border-[#D3DFE9]">
                                            Opcional
                                          </span>
                                        )}
                                      </div>
                                      <Input
                                        placeholder="Ex: PI20240012345"
                                        disabled={isVistoriaConcluida}
                                        value={form.numeroArt || ''}
                                        onChange={(e) =>
                                          handleFieldChange(
                                            subKey,
                                            'numeroArt',
                                            e.target.value,
                                            sub,
                                            cat,
                                          )
                                        }
                                        className="border-[#D3DFE9] bg-white text-xs h-9 font-mono disabled:bg-slate-100 disabled:opacity-80"
                                      />
                                    </div>

                                    {/* Data do último serviço (Apenas quando o subitem tiver Periodicidade definida) */}
                                    {sub.periodicidadeDias && sub.periodicidadeDias > 0 ? (
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <Label className="text-xs font-bold text-[#102A43] flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-[#004B8D]" />
                                            Data do último serviço{' '}
                                            <span className="text-rose-600">*</span>
                                          </Label>
                                          <span className="text-[10px] text-[#004B8D] font-bold bg-[#E8F1F8] px-1.5 py-0.5 rounded border border-[#004B8D]/20">
                                            Periodicidade: {sub.periodicidadeDias} dias
                                          </span>
                                        </div>
                                        <Input
                                          type="date"
                                          disabled={isVistoriaConcluida}
                                          value={
                                            form.dataUltimoServico ||
                                            form.dataUltimaVerificacao ||
                                            ''
                                          }
                                          onChange={(e) => {
                                            handleFieldChange(
                                              subKey,
                                              'dataUltimoServico',
                                              e.target.value,
                                              sub,
                                              cat,
                                            )
                                          }}
                                          className="border-[#D3DFE9] bg-white text-xs h-9 disabled:bg-slate-100 disabled:opacity-80"
                                        />
                                        {/* Informações detalhadas de vencimento calculado */}
                                        {(() => {
                                          const dateVal =
                                            form.dataUltimoServico || form.dataUltimaVerificacao
                                          if (!dateVal) {
                                            return (
                                              <p className="text-[11px] text-amber-700 bg-amber-50/70 p-1.5 rounded border border-amber-200">
                                                Informe a data em que o serviço foi realizado
                                                conforme laudo/documento para calcular a validade.
                                              </p>
                                            )
                                          }
                                          const calc = calcularVencimentoSubitem(
                                            dateVal,
                                            sub.periodicidadeDias,
                                          )
                                          if (calc.status === 'vencido') {
                                            return (
                                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 p-1.5 rounded border border-rose-200">
                                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                <span>
                                                  Vencido há {calc.diasVencido}{' '}
                                                  {calc.diasVencido === 1 ? 'dia' : 'dias'} (expirou
                                                  em {calc.dataVencimentoStr})
                                                </span>
                                              </div>
                                            )
                                          }
                                          if (calc.status === 'vencendo_em_breve') {
                                            return (
                                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                                <span>
                                                  Vencendo em breve: restam {calc.diasAteVencimento}{' '}
                                                  {calc.diasAteVencimento === 1 ? 'dia' : 'dias'}{' '}
                                                  (vence em {calc.dataVencimentoStr})
                                                </span>
                                              </div>
                                            )
                                          }
                                          return (
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                              <span>
                                                Válido até {calc.dataVencimentoStr} (faltam{' '}
                                                {calc.diasAteVencimento} dias)
                                              </span>
                                            </div>
                                          )
                                        })()}
                                      </div>
                                    ) : null}

                                    {/* Este serviço é feito periodicamente? */}
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-bold text-[#102A43]">
                                        Este serviço é feito periodicamente?
                                      </Label>
                                      <Select
                                        disabled={isVistoriaConcluida}
                                        value={form.servicoPeriodico || ''}
                                        onValueChange={(val) => {
                                          handleFieldChange(
                                            subKey,
                                            'servicoPeriodico',
                                            val,
                                            sub,
                                            cat,
                                          )
                                          if (val !== 'Sim') {
                                            handleFieldChange(
                                              subKey,
                                              'periodicidadeMeses',
                                              null,
                                              sub,
                                              cat,
                                            )
                                            handleFieldChange(subKey, 'dataUltimaArt', '', sub, cat)
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="border-[#D3DFE9] text-xs h-9 bg-white">
                                          <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Sim">Sim (periódico)</SelectItem>
                                          <SelectItem value="Não">Não (eventual/único)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Periodicidade em meses e Data da última ART (Condicionais a "Sim (periódico)") */}
                                    {form.servicoPeriodico === 'Sim' && (
                                      <div className="sm:col-span-2 p-3.5 rounded-lg bg-[#E8F1F8]/60 border border-[#004B8D]/20 animate-page-enter space-y-3.5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                          {/* De quantos em quantos meses esse serviço é realizado? */}
                                          <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                              <Label
                                                htmlFor={`period-meses-${subKey}`}
                                                className="text-xs font-bold text-[#004B8D] flex items-center gap-1.5"
                                              >
                                                <Clock className="w-3.5 h-3.5 text-[#004B8D]" />
                                                De quantos em quantos meses esse serviço é
                                                realizado?
                                              </Label>
                                              <span className="text-[10px] text-[#486581] font-semibold bg-white px-1.5 py-0.5 rounded border border-[#D3DFE9]">
                                                (em meses)
                                              </span>
                                            </div>
                                            <Input
                                              id={`period-meses-${subKey}`}
                                              type="number"
                                              disabled={isVistoriaConcluida}
                                              min={1}
                                              max={120}
                                              placeholder="Ex: 1, 3, 6, 12..."
                                              value={
                                                form.periodicidadeMeses !== undefined &&
                                                form.periodicidadeMeses !== null
                                                  ? form.periodicidadeMeses
                                                  : ''
                                              }
                                              onChange={(e) => {
                                                const raw = e.target.value
                                                const val = raw ? parseInt(raw, 10) : null
                                                handleFieldChange(
                                                  subKey,
                                                  'periodicidadeMeses',
                                                  val,
                                                  sub,
                                                  cat,
                                                )
                                              }}
                                              className="border-[#D3DFE9] text-xs h-9 bg-white focus-visible:ring-[#004B8D] disabled:bg-slate-100 disabled:opacity-80"
                                            />
                                            {form.periodicidadeMeses ? (
                                              <p className="text-[11px] font-semibold text-[#004B8D]">
                                                Realizado a cada {form.periodicidadeMeses}{' '}
                                                {form.periodicidadeMeses === 1 ? 'mês' : 'meses'}
                                              </p>
                                            ) : null}
                                          </div>

                                          {/* Data da última ART */}
                                          <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                              <Label
                                                htmlFor={`data-art-${subKey}`}
                                                className="text-xs font-bold text-[#004B8D] flex items-center gap-1.5"
                                              >
                                                <Calendar className="w-3.5 h-3.5 text-[#004B8D]" />
                                                Data da última ART
                                              </Label>
                                              <span className="text-[10px] text-[#486581] font-semibold bg-white px-1.5 py-0.5 rounded border border-[#D3DFE9]">
                                                Conforme ART
                                              </span>
                                            </div>
                                            <Input
                                              id={`data-art-${subKey}`}
                                              type="date"
                                              disabled={isVistoriaConcluida}
                                              value={form.dataUltimaArt || ''}
                                              onChange={(e) => {
                                                handleFieldChange(
                                                  subKey,
                                                  'dataUltimaArt',
                                                  e.target.value,
                                                  sub,
                                                  cat,
                                                )
                                              }}
                                              className="border-[#D3DFE9] text-xs h-9 bg-white focus-visible:ring-[#004B8D] disabled:bg-slate-100 disabled:opacity-80"
                                            />
                                            {form.dataUltimaArt && (
                                              <p className="text-[11px] text-[#486581]">
                                                Data informada da ART para cálculo de validade.
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        {/* Alerta / Indicador de validade calculado a partir da ART e periodicidade em meses */}
                                        {(() => {
                                          if (!form.dataUltimaArt && !form.periodicidadeMeses) {
                                            return null
                                          }
                                          if (
                                            form.dataUltimaArt &&
                                            (!form.periodicidadeMeses ||
                                              form.periodicidadeMeses <= 0)
                                          ) {
                                            return (
                                              <p className="text-[11px] text-amber-700 bg-amber-50/70 p-2 rounded border border-amber-200">
                                                Informe de quantos em quantos meses o serviço é
                                                realizado para calcular o vencimento da ART.
                                              </p>
                                            )
                                          }
                                          if (
                                            !form.dataUltimaArt &&
                                            form.periodicidadeMeses &&
                                            form.periodicidadeMeses > 0
                                          ) {
                                            return (
                                              <p className="text-[11px] text-amber-700 bg-amber-50/70 p-2 rounded border border-amber-200">
                                                Informe a <strong>Data da última ART</strong> para
                                                calcular a vigência do serviço.
                                              </p>
                                            )
                                          }
                                          const calcArt = calcularVencimentoSubitem(
                                            form.dataUltimoServico || form.dataUltimaVerificacao,
                                            sub.periodicidadeDias,
                                            {
                                              periodicidadeMeses: form.periodicidadeMeses,
                                              dataUltimaArt: form.dataUltimaArt,
                                            },
                                          )
                                          if (calcArt.status === 'vencido') {
                                            return (
                                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                <span>
                                                  ART vencida há {calcArt.diasVencido}{' '}
                                                  {calcArt.diasVencido === 1 ? 'dia' : 'dias'}{' '}
                                                  (expirou em {calcArt.dataVencimentoStr})
                                                </span>
                                              </div>
                                            )
                                          }
                                          if (calcArt.status === 'vencendo_em_breve') {
                                            return (
                                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                                <span>
                                                  ART vencendo em breve: restam{' '}
                                                  {calcArt.diasAteVencimento}{' '}
                                                  {calcArt.diasAteVencimento === 1 ? 'dia' : 'dias'}{' '}
                                                  (vence em {calcArt.dataVencimentoStr})
                                                </span>
                                              </div>
                                            )
                                          }
                                          return (
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                              <span>
                                                ART válida até {calcArt.dataVencimentoStr} (faltam{' '}
                                                {calcArt.diasAteVencimento} dias)
                                              </span>
                                            </div>
                                          )
                                        })()}
                                      </div>
                                    )}
                                  </div>

                                  {/* Seção de Fotos (Até 3 fotos com preview e remoção) */}
                                  <div className="pt-3 border-t border-[#D3DFE9]">
                                    <PhotoUploadSection
                                      itemId={item?.id}
                                      subitemCode={subCode}
                                      disabled={isVistoriaConcluida}
                                      existingPhotos={item?.fotos || []}
                                      pendingFiles={pending}
                                      onAddFiles={(files, metaList) =>
                                        handleAddPendingPhotos(subKey, files, metaList)
                                      }
                                      onRemovePendingFile={(index) =>
                                        !isVistoriaConcluida &&
                                        handleRemovePendingPhoto(subKey, index)
                                      }
                                      onDeleteExistingPhoto={(filename) =>
                                        !isVistoriaConcluida &&
                                        handleDeleteExistingPhoto(subKey, filename)
                                      }
                                    />
                                  </div>
                                </div>
                              )}

                            {/* Subitem Save Action (ou indicador de salvamento automático) */}
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] text-[#627D98] italic">
                                {isVistoriaConcluida
                                  ? 'Item em modo somente leitura (vistoria concluída).'
                                  : 'As alterações são salvas automaticamente.'}
                              </span>

                              <Button
                                type="button"
                                onClick={() => handleSaveSubitem(sub, cat)}
                                disabled={isSaving || isVistoriaConcluida}
                                variant="outline"
                                className="border-[#004B8D]/30 text-[#004B8D] hover:bg-[#E8F1F8] font-bold text-xs h-7 px-3 gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Salvando...
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3 h-3" />
                                    Salvar agora
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </div>
      ) : (
        /* 5. Lista de Vistorias Abertas organizadas pelo tipo selecionado */
        <div className="space-y-5">
          {/* Métricas rápidas: Total, Em Andamento e Concluídas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-[#D3DFE9] shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-[#627D98] uppercase tracking-wider">
                  Total de Vistorias
                </p>
                <p className="text-xl font-bold text-[#102A43] mt-0.5">{allVistorias.length}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#E8F1F8] flex items-center justify-center text-[#004B8D]">
                <ClipboardList className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
                  Em Andamento
                </p>
                <p className="text-xl font-bold text-amber-900 mt-0.5">
                  {allVistorias.filter((v) => v.status !== 'concluida').length}
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                  Concluídas
                </p>
                <p className="text-xl font-bold text-emerald-900 mt-0.5">
                  {allVistorias.filter((v) => v.status === 'concluida').length}
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <h2 className="text-lg font-bold text-[#102A43]">
                {selectedTipoFiltro === 'todos'
                  ? 'Vistorias Cadastradas'
                  : `Vistorias: ${selectedTipoFiltro}`}
              </h2>
              <p className="text-xs text-[#486581]">
                Selecione uma vistoria abaixo para abrir o checklist em dois níveis ou gerar o
                relatório
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#486581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                placeholder="Buscar vistoria..."
                value={searchOpenVistorias}
                onChange={(e) => setSearchOpenVistorias(e.target.value)}
                className="pl-9 h-9 text-xs border-[#D3DFE9] focus-visible:ring-[#004B8D]"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-[#486581]">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#004B8D] mb-2" />
              <p className="text-xs font-semibold">Carregando vistorias abertas...</p>
            </div>
          ) : filteredOpenVistorias.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-[#D3DFE9] p-12 text-center space-y-3">
              <ClipboardCheck className="w-12 h-12 text-[#829AB1] mx-auto stroke-[1.5]" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#102A43]">
                  {selectedTipoFiltro === 'todos'
                    ? 'Nenhuma vistoria em andamento'
                    : `Nenhuma vistoria em andamento para ${selectedTipoFiltro}`}
                </h3>
                <p className="text-xs text-[#486581] max-w-sm mx-auto">
                  Utilize o botão &ldquo;Nova Vistoria&rdquo; ou o seletor acima para iniciar o
                  checklist técnico de uma unidade.
                </p>
              </div>
              <Button
                onClick={() => setIsNovaVistoriaOpen(true)}
                className="bg-[#004B8D] hover:bg-[#003666] text-white text-xs font-bold h-9 px-4 mt-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Iniciar Fiscalização
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOpenVistorias.map((vistoria) => (
                <VistoriaCard
                  key={vistoria.id}
                  vistoria={vistoria}
                  pendentesCount={0}
                  vencidosCount={0}
                  conformesCount={0}
                  totalItensCount={allRelevantSubitens.length}
                  isGeneratingReport={generatingCardPdfId === vistoria.id}
                  onGenerateReport={() => handleGeneratePdfForVistoriaCard(vistoria)}
                  onClick={() => {
                    if (vistoria.hospital) {
                      handleSelectHospital(vistoria.hospital)
                      setSearchParams({
                        hospitalId: vistoria.hospital,
                        vistoriaId: vistoria.id,
                        ...(selectedTipoFiltro !== 'todos' ? { tipo: selectedTipoFiltro } : {}),
                      })
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nova Vistoria Dialog */}
      <NovaVistoriaDialog
        open={isNovaVistoriaOpen}
        onOpenChange={setIsNovaVistoriaOpen}
        hospitais={hospitais}
        tipos={tiposEmpreendimento}
        selectedTipoFiltro={selectedTipoFiltro !== 'todos' ? selectedTipoFiltro : undefined}
        onSelectHospital={async (hospId) => {
          await loadInitialData()
          handleSelectHospital(hospId)
        }}
      />

      {/* Caixa Flutuante Discreta de Status do Salvamento Automático */}
      {selectedHospitalId && !isVistoriaConcluida && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 transition-all duration-300 pointer-events-none sm:pointer-events-auto ${
            autoSaveStatus === 'idle' ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#102A43]/90 text-white shadow-lg backdrop-blur-sm border border-white/10 text-xs font-semibold">
            {autoSaveStatus === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                <span className="text-white">Salvando alterações...</span>
              </>
            )}
            {autoSaveStatus === 'saved' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-100">
                  Salvo {lastSavedTime ? `às ${lastSavedTime}` : ''}
                </span>
              </>
            )}
            {autoSaveStatus === 'error' && (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-200">Falha ao salvar automaticamente</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirm Finalizar Vistoria Dialog */}
      <AlertDialog open={isFinalizarDialogOpen} onOpenChange={setIsFinalizarDialogOpen}>
        <AlertDialogContent className="border-[#D3DFE9] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#102A43] flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              Finalizar Vistoria Técnica
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#486581] space-y-2">
              <p>
                Tem certeza que deseja finalizar a vistoria de &ldquo;
                <strong>{selectedHospital?.nome}</strong>&rdquo;?
              </p>
              <p className="text-xs text-[#627D98] bg-[#F4F6F9] p-3 rounded-lg border border-[#D3DFE9]">
                Ao finalizar, o checklist ficará travado para novas edições e a vistoria passará a
                constar como <strong>Concluída</strong> nos relatórios e no Painel Geral. Você
                poderá reabri-la a qualquer momento se precisar fazer correções posteriores.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#D3DFE9] text-[#486581] cursor-pointer">
              Continuar Editando
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalizarVistoria}
              disabled={isFinalizando}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
            >
              {isFinalizando ? 'Finalizando...' : 'Sim, Finalizar Vistoria'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
