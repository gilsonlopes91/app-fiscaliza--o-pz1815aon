import pb from '@/lib/pocketbase/client'
import { Hospital } from './hospitais'
import { CategoriaVistoria } from './categoriasVistoria'

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
  categoria: string
  possuiSistema?: 'Sim' | 'Não' | '' | null
  servicoPeriodico?: 'Sim' | 'Não' | '' | null
  periodicidadeMeses?: number | null
  prestadorServico?: string
  numeroArt?: string
  fotos?: string[]
  dataUltimaVerificacao?: string | null
  situacaoCalculada?: SituacaoChecklist
  created: string
  updated: string
  expand?: {
    categoria?: CategoriaVistoria
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
 * Calculates checklist item situation:
 * Precedência:
 * 1. "Não" -> "não se aplica"
 * 2. Se não respondeu possuiSistema ("Sim" ou "Não"), retorna null (não avaliado)
 * 3. Se possui ("Sim"):
 *    a. "vencido" - se a categoria ou serviço é periódico com periodicidadeDias > 0 e a data da última verificação passou da periodicidade ou não foi informada
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
  categoria: {
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
  // Se a categoria tem periodicidade fixa definida (> 0) OU se o usuário marcou que o serviço é feito periodicamente
  const periodicidadeExigida = Boolean(
    categoria.periodicidadeDias && categoria.periodicidadeDias > 0,
  )

  if (periodicidadeExigida) {
    if (!data.dataUltimaVerificacao) {
      // Periodicidade exigida pela categoria técnica mas data não informada
      return 'vencido'
    }

    const verificacaoDate = new Date(data.dataUltimaVerificacao)
    if (isNaN(verificacaoDate.getTime())) {
      return 'vencido'
    }

    const today = new Date()
    const diffMs = today.getTime() - verificacaoDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (categoria.periodicidadeDias && diffDays > categoria.periodicidadeDias) {
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
   * Get all checklist items for a specific vistoria
   */
  async getItensByVistoria(vistoriaId: string): Promise<VistoriaItem[]> {
    return await pb.collection('vistoria_itens').getFullList<VistoriaItem>({
      filter: `vistoria = "${vistoriaId}"`,
      expand: 'categoria,hospital',
    })
  },

  /**
   * Create a new vistoria for a hospital (allows multiple vistorias over time or for a specific inspection)
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
   * Save or update a checklist item, with support for File upload (FormData)
   */
  async saveItem(
    vistoriaId: string,
    hospitalId: string,
    categoriaId: string,
    formData: VistoriaItemFormData,
    categoria: { exigeArt?: boolean; periodicidadeDias?: number | null },
    existingItemId?: string,
    newFiles?: File[],
    deletedFileNames?: string[],
  ): Promise<VistoriaItem> {
    const situacao = calculateItemSituacao(formData, categoria)

    // If newFiles or deletedFileNames are present, we use multipart FormData
    if ((newFiles && newFiles.length > 0) || (deletedFileNames && deletedFileNames.length > 0)) {
      const data = new FormData()
      data.append('vistoria', vistoriaId)
      data.append('hospital', hospitalId)
      data.append('categoria', categoriaId)
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
          expand: 'categoria,hospital',
        })
      }

      // Check if item exists
      try {
        const existing = await pb.collection('vistoria_itens').getList<VistoriaItem>(1, 1, {
          filter: `vistoria = "${vistoriaId}" && categoria = "${categoriaId}"`,
        })
        if (existing.items.length > 0) {
          return await pb
            .collection('vistoria_itens')
            .update<VistoriaItem>(existing.items[0].id, data, {
              expand: 'categoria,hospital',
            })
        }
      } catch {
        // Continue to create
      }

      return await pb.collection('vistoria_itens').create<VistoriaItem>(data, {
        expand: 'categoria,hospital',
      })
    }

    // Standard JSON payload
    const payload: Record<string, unknown> = {
      vistoria: vistoriaId,
      hospital: hospitalId,
      categoria: categoriaId,
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
    }

    if (existingItemId) {
      return await pb.collection('vistoria_itens').update<VistoriaItem>(existingItemId, payload, {
        expand: 'categoria,hospital',
      })
    }

    // Check if an item already exists in DB to prevent duplicates
    try {
      const existing = await pb.collection('vistoria_itens').getList<VistoriaItem>(1, 1, {
        filter: `vistoria = "${vistoriaId}" && categoria = "${categoriaId}"`,
      })
      if (existing.items.length > 0) {
        return await pb
          .collection('vistoria_itens')
          .update<VistoriaItem>(existing.items[0].id, payload, {
            expand: 'categoria,hospital',
          })
      }
    } catch {
      // Continue to create
    }

    return await pb.collection('vistoria_itens').create<VistoriaItem>(payload, {
      expand: 'categoria,hospital',
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
      expand: 'categoria,hospital',
    })
  },

  /**
   * Remove a specific photo filename from an item
   */
  async deleteItemPhoto(itemId: string, filename: string): Promise<VistoriaItem> {
    const formData = new FormData()
    formData.append('fotos-', filename)
    return await pb.collection('vistoria_itens').update<VistoriaItem>(itemId, formData, {
      expand: 'categoria,hospital',
    })
  },
}
