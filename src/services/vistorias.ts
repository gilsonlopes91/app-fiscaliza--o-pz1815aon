import pb from '@/lib/pocketbase/client'
import { Hospital } from './hospitais'
import { CategoriaVistoria, SubitemChecklist } from './categoriasVistoria'

export type SituacaoChecklist =
  | 'não se aplica'
  | 'pendente'
  | 'vencido'
  | 'vencendo_em_breve'
  | 'conforme'
  | 'nao_conforme'
  | null

export interface StatusVencimentoItem {
  status: 'vencido' | 'vencendo_em_breve' | 'regular' | 'nao_aplicavel' | 'sem_data'
  diasAteVencimento: number | null
  diasVencido: number | null
  dataVencimento: Date | null
  dataVencimentoStr: string | null
}

export interface Vistoria {
  id: string
  hospital: string
  status?: 'em_andamento' | 'concluida'
  observacoes?: string
  created: string
  updated: string
  expand?: {
    hospital?: Hospital
  }
}

export type PossuiSistemaOption = 'Sim' | 'Não' | 'Não se aplica' | '' | null

export interface VistoriaItem {
  id: string
  vistoria: string
  hospital: string
  categoria: string // ID da CategoriaVistoria (Item Principal)
  subitem?: string // ID do SubitemChecklist (Subitem Nível 2)
  possuiSistema?: PossuiSistemaOption
  atividadeRegularizada?: 'Sim' | 'Não' | '' | null
  servicoPeriodico?: 'Sim' | 'Não' | '' | null
  periodicidadeMeses?: number | null
  prestadorServico?: string
  numeroArt?: string
  dataUltimaArt?: string | null
  fotos?: string[]
  dataUltimaVerificacao?: string | null
  dataUltimoServico?: string | null
  situacaoCalculada?: SituacaoChecklist
  latitude?: number | null
  longitude?: number | null
  dataCaptura?: string | null
  fotoMetadata?: Array<{
    fileName: string
    latitude: number | null
    longitude: number | null
    dataCaptura: string
  }> | null
  created: string
  updated: string
  expand?: {
    categoria?: CategoriaVistoria
    subitem?: SubitemChecklist
    hospital?: Hospital
  }
}

export interface VistoriaItemFormData {
  possuiSistema?: PossuiSistemaOption
  atividadeRegularizada?: 'Sim' | 'Não' | '' | null
  servicoPeriodico?: 'Sim' | 'Não' | '' | null
  periodicidadeMeses?: number | null
  prestadorServico?: string
  numeroArt?: string
  dataUltimaArt?: string | null
  fotos?: string[]
  dataUltimaVerificacao?: string | null
  dataUltimoServico?: string | null
  latitude?: number | null
  longitude?: number | null
  dataCaptura?: string | null
  fotoMetadata?: Array<{
    fileName: string
    latitude: number | null
    longitude: number | null
    dataCaptura: string
  }> | null
}

/**
 * Helper to get public URL for a photo file on a record
 */
export function getVistoriaItemPhotoUrl(
  record: { id: string; collectionId?: string; collectionName?: string },
  filename: string,
): string {
  return pb.files.getURL(record, filename)
}

/**
 * Normaliza uma data no formato YYYY-MM-DD para meia-noite local,
 * evitando discrepâncias de fuso horário UTC na virada do dia.
 */
export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const clean = dateStr.split('T')[0]
  const parts = clean.split('-')
  if (parts.length !== 3) return null
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  return new Date(year, month, day, 0, 0, 0, 0)
}

/**
 * Calcula o vencimento exato de um subitem que possui periodicidade (em dias) e data do último serviço.
 *
 * Regra do usuário:
 * - Data de vencimento = data do último serviço + periodicidade (em dias)
 * - Vencido: já passou do prazo (dias até o vencimento < 0)
 * - Vencendo em breve: faltam 30 dias ou menos para completar a periodicidade (0 <= diasAteVencimento <= 30)
 * - Regular: faltam mais de 30 dias
 */
export function calcularVencimentoSubitem(
  dataServicoStr: string | null | undefined,
  periodicidadeDias: number | null | undefined,
  options?: {
    periodicidadeMeses?: number | null
    dataUltimaArt?: string | null
  },
): StatusVencimentoItem {
  // Se houver data da última ART e periodicidade em meses informada, usa cálculo por meses via ART
  const temArtMeses = Boolean(
    options?.dataUltimaArt && options?.periodicidadeMeses && options.periodicidadeMeses > 0,
  )

  let baseDate: Date | null = null
  let vencimentoDate: Date | null = null

  if (temArtMeses) {
    const artDate = parseLocalDate(options!.dataUltimaArt!)
    if (artDate && !isNaN(artDate.getTime())) {
      baseDate = artDate
      // Adiciona meses à data base da ART
      vencimentoDate = new Date(artDate.getTime())
      vencimentoDate.setMonth(vencimentoDate.getMonth() + options!.periodicidadeMeses!)
    }
  }

  // Se não calculou via ART em meses, usa a regra tradicional de periodicidade em dias
  if (!vencimentoDate) {
    const dias =
      periodicidadeDias && periodicidadeDias > 0
        ? periodicidadeDias
        : options?.periodicidadeMeses && options.periodicidadeMeses > 0
          ? Math.round(options.periodicidadeMeses * 30.4375)
          : null

    if (!dias || dias <= 0) {
      return {
        status: 'nao_aplicavel',
        diasAteVencimento: null,
        diasVencido: null,
        dataVencimento: null,
        dataVencimentoStr: null,
      }
    }

    const dataRef = dataServicoStr || options?.dataUltimaArt
    if (!dataRef) {
      return {
        status: 'sem_data',
        diasAteVencimento: null,
        diasVencido: null,
        dataVencimento: null,
        dataVencimentoStr: null,
      }
    }

    baseDate = parseLocalDate(dataRef)
    if (!baseDate || isNaN(baseDate.getTime())) {
      return {
        status: 'sem_data',
        diasAteVencimento: null,
        diasVencido: null,
        dataVencimento: null,
        dataVencimentoStr: null,
      }
    }

    vencimentoDate = new Date(baseDate.getTime() + dias * 24 * 60 * 60 * 1000)
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const diffMs = vencimentoDate.getTime() - hoje.getTime()
  const diasAteVencimento = Math.round(diffMs / (1000 * 60 * 60 * 24))

  const ano = vencimentoDate.getFullYear()
  const mes = String(vencimentoDate.getMonth() + 1).padStart(2, '0')
  const dia = String(vencimentoDate.getDate()).padStart(2, '0')
  const dataVencimentoStr = `${dia}/${mes}/${ano}`

  if (diasAteVencimento < 0) {
    return {
      status: 'vencido',
      diasAteVencimento,
      diasVencido: Math.abs(diasAteVencimento),
      dataVencimento: vencimentoDate,
      dataVencimentoStr,
    }
  }

  if (diasAteVencimento <= 30) {
    return {
      status: 'vencendo_em_breve',
      diasAteVencimento,
      diasVencido: null,
      dataVencimento: vencimentoDate,
      dataVencimentoStr,
    }
  }

  return {
    status: 'regular',
    diasAteVencimento,
    diasVencido: null,
    dataVencimento: vencimentoDate,
    dataVencimentoStr,
  }
}

/**
 * Calculates checklist subitem situation:
 * Precedência:
 * 1. "Não" ou "Não se aplica" -> "não se aplica"
 * 2. Se não respondeu possuiSistema ("Sim" ou "Não"), retorna null (não avaliado / pendente)
 * 3. Se possui ("Sim"):
 *    a. Se subitem tem periodicidade fixa definida:
 *       - Sem data de serviço: 'vencido' (pendente de documento ou fora de conformidade)
 *       - Prazo expirado (diasAteVencimento < 0): 'vencido'
 *       - Vencendo em breve (<= 30 dias): 'vencendo_em_breve'
 *       - Regular (> 30 dias): 'conforme'
 *    b. Se não exige periodicidade: 'conforme'
 */
export function calculateItemSituacao(
  data: {
    possuiSistema?: PossuiSistemaOption
    atividadeRegularizada?: 'Sim' | 'Não' | '' | null
    servicoPeriodico?: 'Sim' | 'Não' | '' | null
    periodicidadeMeses?: number | null
    prestadorServico?: string
    numeroArt?: string
    dataUltimaArt?: string | null
    dataUltimaVerificacao?: string | null
    dataUltimoServico?: string | null
  },
  itemInfo: {
    exigeArt?: boolean
    periodicidadeDias?: number | null
  },
): SituacaoChecklist {
  if (data.possuiSistema === 'Não' || data.possuiSistema === 'Não se aplica') {
    return 'não se aplica'
  }

  if (data.possuiSistema !== 'Sim') {
    return null
  }

  // Quando possui o sistema ("Sim") e o fiscal marcou atividadeRegularizada como "Não":
  // Subitem passa a ser marcado automaticamente como "Não conforme"
  if (data.atividadeRegularizada === 'Não') {
    return 'nao_conforme'
  }

  // Hospital possui o sistema ("Sim")
  // 1. Se serviço for periódico e tiver periodicidade em meses com Data da última ART:
  if (data.servicoPeriodico === 'Sim' && data.periodicidadeMeses && data.periodicidadeMeses > 0) {
    if (data.dataUltimaArt) {
      const calcArt = calcularVencimentoSubitem(
        data.dataUltimoServico || data.dataUltimaVerificacao,
        itemInfo.periodicidadeDias,
        {
          periodicidadeMeses: data.periodicidadeMeses,
          dataUltimaArt: data.dataUltimaArt,
        },
      )
      if (calcArt.status === 'vencido') return 'vencido'
      if (calcArt.status === 'vencendo_em_breve') return 'vencendo_em_breve'
      if (calcArt.status === 'sem_data') return 'vencido'
      return 'conforme'
    }
  }

  // 2. Se o subitem tem periodicidade fixa definida (> 0)
  const periodicidadeExigida = Boolean(itemInfo.periodicidadeDias && itemInfo.periodicidadeDias > 0)

  if (periodicidadeExigida) {
    const dataServico = data.dataUltimoServico || data.dataUltimaVerificacao
    if (!dataServico) {
      return 'vencido'
    }

    const calc = calcularVencimentoSubitem(dataServico, itemInfo.periodicidadeDias, {
      periodicidadeMeses: data.periodicidadeMeses,
      dataUltimaArt: data.dataUltimaArt,
    })
    if (calc.status === 'vencido') {
      return 'vencido'
    }
    if (calc.status === 'vencendo_em_breve') {
      return 'vencendo_em_breve'
    }
    if (calc.status === 'sem_data') {
      return 'vencido'
    }
    return 'conforme'
  }

  return 'conforme'
}

export const vistoriasService = {
  /**
   * List all vistorias with expanded hospital data
   */
  async getAll(): Promise<Vistoria[]> {
    return await pb.collection('vistorias').getFullList<Vistoria>({
      sort: '-created',
      expand: 'hospital',
    })
  },

  /**
   * Find existing vistoria for a specific hospital
   */
  async getByHospitalId(hospitalId: string): Promise<Vistoria | null> {
    try {
      const records = await pb.collection('vistorias').getList<Vistoria>(1, 1, {
        filter: `hospital = "${hospitalId}"`,
        sort: '-created',
        expand: 'hospital',
      })
      return records.items[0] || null
    } catch {
      return null
    }
  },

  /**
   * Get vistoria by its ID
   */
  async getById(id: string): Promise<Vistoria> {
    return await pb.collection('vistorias').getOne<Vistoria>(id, {
      expand: 'hospital',
    })
  },

  /**
   * Get or create a vistoria for a given hospital (ensuring 1 vistoria per hospital)
   */
  async getOrCreateForHospital(hospitalId: string): Promise<Vistoria> {
    const existing = await this.getByHospitalId(hospitalId)
    if (existing) {
      return existing
    }

    const record = await pb.collection('vistorias').create<Vistoria>(
      {
        hospital: hospitalId,
        status: 'em_andamento',
      },
      {
        expand: 'hospital',
      },
    )

    return record
  },

  /**
   * Get all checklist items across all vistorias (with expanded relations)
   */
  async getAllItens(): Promise<VistoriaItem[]> {
    return await pb.collection('vistoria_itens').getFullList<VistoriaItem>({
      sort: '-created',
      expand: 'vistoria,vistoria.hospital,categoria,subitem,hospital',
    })
  },

  /**
   * Get all checklist items for a specific vistoria (with expanded subitem and categoria)
   */
  async getItensByVistoria(vistoriaId: string): Promise<VistoriaItem[]> {
    return await pb.collection('vistoria_itens').getFullList<VistoriaItem>({
      filter: `vistoria = "${vistoriaId}"`,
      expand: 'categoria,subitem,hospital',
    })
  },

  /**
   * Create a new vistoria for a hospital
   */
  async createVistoria(hospitalId: string, observacoes?: string): Promise<Vistoria> {
    return await pb.collection('vistorias').create<Vistoria>(
      {
        hospital: hospitalId,
        status: 'em_andamento',
        observacoes: observacoes || '',
      },
      {
        expand: 'hospital',
      },
    )
  },

  /**
   * Get all open vistorias with expanded hospital data
   */
  async getOpenVistorias(): Promise<Vistoria[]> {
    return await pb.collection('vistorias').getFullList<Vistoria>({
      filter: 'status = "em_andamento"',
      sort: '-created',
      expand: 'hospital',
    })
  },

  /**
   * Save or update a checklist subitem answer, with support for File uploads.
   * Links to both the categoria (main item) and subitem (subitem ID).
   */
  async saveItem(
    vistoriaId: string,
    hospitalId: string,
    categoriaId: string,
    formData: VistoriaItemFormData,
    subitemInfo: { exigeArt?: boolean; periodicidadeDias?: number | null },
    existingItemId?: string,
    newFiles?: File[],
    deletedFileNames?: string[],
    subitemId?: string,
    fiscalId?: string,
  ): Promise<VistoriaItem> {
    // Garante que, se a unidade não possui atribuição formal de fiscal,
    // o fiscal atual seja registrado automaticamente como responsável
    const targetFiscalId = fiscalId || pb.authStore.record?.id
    if (targetFiscalId && hospitalId) {
      try {
        const existing = await pb.collection('atribuicoes').getList(1, 1, {
          filter: `hospital = "${hospitalId}"`,
        })
        if (existing.items.length === 0) {
          await pb.collection('atribuicoes').create({
            fiscal: targetFiscalId,
            hospital: hospitalId,
            created_by: targetFiscalId,
            observacao: 'Atribuição automática vinculada ao checklist de vistoria',
          })
        }
      } catch (e) {
        console.warn('Erro ao verificar auto-atribuição no salvamento:', e)
      }
    }

    const situacao = calculateItemSituacao(formData, subitemInfo)

    // If newFiles or deletedFileNames are present, we use multipart FormData
    if ((newFiles && newFiles.length > 0) || (deletedFileNames && deletedFileNames.length > 0)) {
      const data = new FormData()
      data.append('vistoria', vistoriaId)
      data.append('hospital', hospitalId)
      data.append('categoria', categoriaId)
      if (subitemId) data.append('subitem', subitemId)
      if (formData.possuiSistema) data.append('possuiSistema', formData.possuiSistema)
      if (formData.atividadeRegularizada) {
        data.append('atividadeRegularizada', formData.atividadeRegularizada)
      } else {
        data.append('atividadeRegularizada', '')
      }
      if (formData.servicoPeriodico) data.append('servicoPeriodico', formData.servicoPeriodico)
      if (
        formData.servicoPeriodico === 'Sim' &&
        formData.periodicidadeMeses !== undefined &&
        formData.periodicidadeMeses !== null
      ) {
        data.append('periodicidadeMeses', String(formData.periodicidadeMeses))
      } else {
        data.append('periodicidadeMeses', '')
      }
      data.append(
        'prestadorServico',
        formData.prestadorServico ? formData.prestadorServico.trim() : '',
      )
      data.append('numeroArt', formData.numeroArt ? formData.numeroArt.trim() : '')
      if (formData.servicoPeriodico === 'Sim' && formData.dataUltimaArt) {
        data.append('dataUltimaArt', formData.dataUltimaArt)
      } else {
        data.append('dataUltimaArt', '')
      }
      const dateToSave = formData.dataUltimoServico || formData.dataUltimaVerificacao
      if (dateToSave) {
        data.append('dataUltimoServico', dateToSave)
        data.append('dataUltimaVerificacao', dateToSave)
      } else {
        data.append('dataUltimoServico', '')
        data.append('dataUltimaVerificacao', '')
      }
      if (situacao) {
        data.append('situacaoCalculada', situacao)
      }

      if (formData.latitude !== undefined && formData.latitude !== null) {
        data.append('latitude', String(formData.latitude))
      }
      if (formData.longitude !== undefined && formData.longitude !== null) {
        data.append('longitude', String(formData.longitude))
      }
      if (formData.dataCaptura) {
        data.append('dataCaptura', formData.dataCaptura)
      }
      if (formData.fotoMetadata) {
        data.append('fotoMetadata', JSON.stringify(formData.fotoMetadata))
      }

      // Append new files
      if (newFiles) {
        for (const file of newFiles) {
          data.append('fotos', file)
        }
      }

      // Handle deleted files in PocketBase: pass 'fotos-' for each removed filename
      if (deletedFileNames) {
        for (const name of deletedFileNames) {
          data.append('fotos-', name)
        }
      }

      if (existingItemId) {
        return await pb.collection('vistoria_itens').update<VistoriaItem>(existingItemId, data, {
          expand: 'categoria,subitem,hospital',
        })
      }

      // Check if item exists by vistoria and subitem (or categoria if no subitem)
      try {
        const filterExpr = subitemId
          ? `vistoria = "${vistoriaId}" && subitem = "${subitemId}"`
          : `vistoria = "${vistoriaId}" && categoria = "${categoriaId}"`
        const existing = await pb.collection('vistoria_itens').getList<VistoriaItem>(1, 1, {
          filter: filterExpr,
        })
        if (existing.items.length > 0) {
          return await pb
            .collection('vistoria_itens')
            .update<VistoriaItem>(existing.items[0].id, data, {
              expand: 'categoria,subitem,hospital',
            })
        }
      } catch {
        // Continue to create
      }

      return await pb.collection('vistoria_itens').create<VistoriaItem>(data, {
        expand: 'categoria,subitem,hospital',
      })
    }

    // Standard JSON payload
    const payload: Record<string, unknown> = {
      vistoria: vistoriaId,
      hospital: hospitalId,
      categoria: categoriaId,
      subitem: subitemId || null,
      possuiSistema: formData.possuiSistema || null,
      atividadeRegularizada: formData.atividadeRegularizada || null,
      servicoPeriodico: formData.servicoPeriodico || null,
      periodicidadeMeses:
        formData.servicoPeriodico === 'Sim' && formData.periodicidadeMeses
          ? Number(formData.periodicidadeMeses)
          : null,
      prestadorServico: formData.prestadorServico ? formData.prestadorServico.trim() : '',
      numeroArt: formData.numeroArt ? formData.numeroArt.trim() : '',
      dataUltimaArt:
        formData.servicoPeriodico === 'Sim' && formData.dataUltimaArt
          ? formData.dataUltimaArt
          : null,
      dataUltimaVerificacao: formData.dataUltimoServico || formData.dataUltimaVerificacao || null,
      dataUltimoServico: formData.dataUltimoServico || formData.dataUltimaVerificacao || null,
      situacaoCalculada: situacao,
      latitude: formData.latitude !== undefined ? formData.latitude : null,
      longitude: formData.longitude !== undefined ? formData.longitude : null,
      dataCaptura: formData.dataCaptura || null,
      fotoMetadata: formData.fotoMetadata || null,
    }

    if (existingItemId) {
      return await pb.collection('vistoria_itens').update<VistoriaItem>(existingItemId, payload, {
        expand: 'categoria,subitem,hospital',
      })
    }

    // Check if an item already exists in DB to prevent duplicates
    try {
      const filterExpr = subitemId
        ? `vistoria = "${vistoriaId}" && subitem = "${subitemId}"`
        : `vistoria = "${vistoriaId}" && categoria = "${categoriaId}"`
      const existing = await pb.collection('vistoria_itens').getList<VistoriaItem>(1, 1, {
        filter: filterExpr,
      })
      if (existing.items.length > 0) {
        return await pb
          .collection('vistoria_itens')
          .update<VistoriaItem>(existing.items[0].id, payload, {
            expand: 'categoria,subitem,hospital',
          })
      }
    } catch {
      // Continue to create
    }

    return await pb.collection('vistoria_itens').create<VistoriaItem>(payload, {
      expand: 'categoria,subitem,hospital',
    })
  },

  /**
   * Update the status of a vistoria ('em_andamento' | 'concluida')
   */
  async updateStatus(
    id: string,
    status: 'em_andamento' | 'concluida',
    observacoes?: string,
  ): Promise<Vistoria> {
    const payload: Record<string, unknown> = { status }
    if (observacoes !== undefined) {
      payload.observacoes = observacoes
    }
    return await pb.collection('vistorias').update<Vistoria>(id, payload, {
      expand: 'hospital',
    })
  },

  /**
   * Upload single/multiple photos to an existing vistoria item
   */
  async uploadItemPhotos(itemId: string, files: File[]): Promise<VistoriaItem> {
    const formData = new FormData()
    for (const file of files) {
      formData.append('fotos', file)
    }
    return await pb.collection('vistoria_itens').update<VistoriaItem>(itemId, formData, {
      expand: 'categoria,subitem,hospital',
    })
  },

  /**
   * Remove a specific photo filename from an item
   */
  async deleteItemPhoto(itemId: string, filename: string): Promise<VistoriaItem> {
    const formData = new FormData()
    formData.append('fotos-', filename)
    return await pb.collection('vistoria_itens').update<VistoriaItem>(itemId, formData, {
      expand: 'categoria,subitem,hospital',
    })
  },
}
