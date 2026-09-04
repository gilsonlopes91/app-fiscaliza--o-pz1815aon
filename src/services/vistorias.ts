import pb from '@/lib/pocketbase/client'
import { Hospital } from './hospitais'
import { CategoriaVistoria, SubitemChecklist } from './categoriasVistoria'

export type SituacaoChecklist = 'não se aplica' | 'pendente' | 'vencido' | 'conforme' | null

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

export interface VistoriaItem {
  id: string
  vistoria: string
  hospital: string
  categoria: string // ID da CategoriaVistoria (Item Principal)
  subitem?: string // ID do SubitemChecklist (Subitem Nível 2)
  possuiSistema?: 'Sim' | 'Não' | '' | null
  servicoPeriodico?: 'Sim' | 'Não' | '' | null
  periodicidadeMeses?: number | null
  prestadorServico?: string
  numeroArt?: string
  fotos?: string[]
  dataUltimaVerificacao?: string | null
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
  possuiSistema?: 'Sim' | 'Não' | '' | null
  servicoPeriodico?: 'Sim' | 'Não' | '' | null
  periodicidadeMeses?: number | null
  prestadorServico?: string
  numeroArt?: string
  fotos?: string[]
  dataUltimaVerificacao?: string | null
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
 * Calculates checklist subitem situation:
 * Precedência:
 * 1. "Não" -> "não se aplica"
 * 2. Se não respondeu possuiSistema ("Sim" ou "Não"), retorna null (não avaliado / pendente)
 * 3. Se possui ("Sim"):
 *    a. "vencido" - se o subitem (ou serviço periódico) tem periodicidade fixa e a data da última verificação expirou ou não foi preenchida
 *    b. "conforme" - preenchido e regular
 */
export function calculateItemSituacao(
  data: {
    possuiSistema?: 'Sim' | 'Não' | '' | null
    servicoPeriodico?: 'Sim' | 'Não' | '' | null
    prestadorServico?: string
    numeroArt?: string
    dataUltimaVerificacao?: string | null
  },
  itemInfo: {
    exigeArt?: boolean
    periodicidadeDias?: number | null
  },
): SituacaoChecklist {
  if (data.possuiSistema === 'Não') {
    return 'não se aplica'
  }

  if (data.possuiSistema !== 'Sim') {
    return null
  }

  // Hospital possui o sistema ("Sim")
  // Se o subitem tem periodicidade fixa definida (> 0)
  const periodicidadeExigida = Boolean(itemInfo.periodicidadeDias && itemInfo.periodicidadeDias > 0)

  if (periodicidadeExigida) {
    if (!data.dataUltimaVerificacao) {
      // Periodicidade exigida pelo item técnico mas data não informada
      return 'vencido'
    }

    const verificacaoDate = new Date(data.dataUltimaVerificacao)
    if (isNaN(verificacaoDate.getTime())) {
      return 'vencido'
    }

    const today = new Date()
    const diffMs = today.getTime() - verificacaoDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (itemInfo.periodicidadeDias && diffDays > itemInfo.periodicidadeDias) {
      return 'vencido'
    }
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
  ): Promise<VistoriaItem> {
    const situacao = calculateItemSituacao(formData, subitemInfo)

    // If newFiles or deletedFileNames are present, we use multipart FormData
    if ((newFiles && newFiles.length > 0) || (deletedFileNames && deletedFileNames.length > 0)) {
      const data = new FormData()
      data.append('vistoria', vistoriaId)
      data.append('hospital', hospitalId)
      data.append('categoria', categoriaId)
      if (subitemId) data.append('subitem', subitemId)
      if (formData.possuiSistema) data.append('possuiSistema', formData.possuiSistema)
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
      if (formData.dataUltimaVerificacao) {
        data.append('dataUltimaVerificacao', formData.dataUltimaVerificacao)
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
      servicoPeriodico: formData.servicoPeriodico || null,
      periodicidadeMeses:
        formData.servicoPeriodico === 'Sim' && formData.periodicidadeMeses
          ? Number(formData.periodicidadeMeses)
          : null,
      prestadorServico: formData.prestadorServico ? formData.prestadorServico.trim() : '',
      numeroArt: formData.numeroArt ? formData.numeroArt.trim() : '',
      dataUltimaVerificacao: formData.dataUltimaVerificacao || null,
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
