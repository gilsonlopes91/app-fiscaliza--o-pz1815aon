import pb from '@/lib/pocketbase/client'
import { Hospital } from './hospitais'
import { UserProfile } from './auth'
import { Vistoria, VistoriaItem, vistoriasService } from './vistorias'
import {
  CategoriaVistoria,
  SubitemChecklist,
  categoriasVistoriaService,
} from './categoriasVistoria'

export interface Atribuicao {
  id: string
  fiscal: string // User ID
  hospital: string // Hospital ID
  created_by?: string // Admin User ID who created
  prazo?: string | null
  observacao?: string
  created: string
  updated: string
  expand?: {
    fiscal?: UserProfile
    hospital?: Hospital
    created_by?: UserProfile
  }
}

export interface AtribuicaoFormData {
  fiscal: string
  hospital: string
  prazo?: string | null
  observacao?: string
}

export interface FiscalProgressSummary {
  fiscalId: string
  fiscalName: string
  fiscalEmail: string
  totalAtribuidos: number
  concluidos: number
  pendentes: number
  atribuicoes: AtribuicaoDetail[]
}

export interface AtribuicaoDetail {
  atribuicao: Atribuicao
  hospital: Hospital | null
  vistoria: Vistoria | null
  totalItensChecklist: number
  itensRespondidosCount: number
  isConcluida: boolean
  percentual: number
}

/**
 * Checks whether all checklist items for a hospital's tipo are answered
 */
export function isVistoriaCompleta(
  itens: VistoriaItem[],
  subitensChecklist: SubitemChecklist[],
  vistoriaStatus?: string,
): boolean {
  if (vistoriaStatus === 'concluida') {
    return true
  }
  if (subitensChecklist.length === 0) {
    return itens.length > 0
  }
  const respondidos = subitensChecklist.filter((sub) => {
    const item = itens.find(
      (i) => i.subitem === sub.id || (!i.subitem && i.categoria === sub.categoria),
    )
    return (
      item &&
      (item.possuiSistema === 'Sim' ||
        item.possuiSistema === 'Não' ||
        item.possuiSistema === 'Não se aplica')
    )
  })
  return respondidos.length >= subitensChecklist.length
}

export const atribuicoesService = {
  /**
   * List all atribuicoes with expanded relations
   */
  async getAll(): Promise<Atribuicao[]> {
    return await pb.collection('atribuicoes').getFullList<Atribuicao>({
      sort: '-created',
      expand: 'fiscal,hospital,created_by',
    })
  },

  /**
   * List atribuicoes assigned to a specific fiscal
   */
  async getByFiscal(fiscalId: string): Promise<Atribuicao[]> {
    return await pb.collection('atribuicoes').getFullList<Atribuicao>({
      filter: `fiscal = "${fiscalId}"`,
      sort: '-created',
      expand: 'fiscal,hospital,created_by',
    })
  },

  /**
   * List atribuicoes for a specific hospital
   */
  async getByHospital(hospitalId: string): Promise<Atribuicao[]> {
    return await pb.collection('atribuicoes').getFullList<Atribuicao>({
      filter: `hospital = "${hospitalId}"`,
      sort: '-created',
      expand: 'fiscal,hospital,created_by',
    })
  },

  /**
   * Checks if an enterprise/unit already has any assignment.
   * If not, automatically creates an assignment linking the given fiscal to this unit.
   * If it already has an assignment (to this fiscal or someone else), does nothing.
   */
  async ensureAssignmentIfUnassigned(
    hospitalId: string,
    fiscalId?: string,
  ): Promise<Atribuicao | null> {
    const targetFiscalId = fiscalId || pb.authStore.record?.id
    if (!targetFiscalId || !hospitalId) return null

    try {
      // 1. Check if ANY assignment already exists for this hospital
      const existing = await pb.collection('atribuicoes').getList<Atribuicao>(1, 1, {
        filter: `hospital = "${hospitalId}"`,
      })

      if (existing.items.length > 0) {
        // Já existe um fiscal atribuído (mantém como está hoje)
        return existing.items[0]
      }

      // 2. Não possui fiscal formalmente atribuído: registrar automaticamente
      const payload: Record<string, unknown> = {
        fiscal: targetFiscalId,
        hospital: hospitalId,
        created_by: targetFiscalId,
        observacao: 'Atribuição automática vinculada ao checklist de vistoria',
      }

      return await pb.collection('atribuicoes').create<Atribuicao>(payload, {
        expand: 'fiscal,hospital,created_by',
      })
    } catch (err) {
      console.warn('Não foi possível verificar ou auto-atribuir vistoria:', err)
      return null
    }
  },

  /**
   * Create a new atribuicao
   */
  async create(data: AtribuicaoFormData): Promise<Atribuicao> {
    const currentUserId = pb.authStore.record?.id || ''
    const payload: Record<string, unknown> = {
      fiscal: data.fiscal,
      hospital: data.hospital,
      created_by: currentUserId || null,
      prazo: data.prazo || null,
      observacao: data.observacao ? data.observacao.trim() : '',
    }

    // Check if duplicate assignment exists
    try {
      const existing = await pb.collection('atribuicoes').getList<Atribuicao>(1, 1, {
        filter: `fiscal = "${data.fiscal}" && hospital = "${data.hospital}"`,
      })
      if (existing.items.length > 0) {
        // Update existing instead of creating duplicate
        return await pb
          .collection('atribuicoes')
          .update<Atribuicao>(existing.items[0].id, payload, {
            expand: 'fiscal,hospital,created_by',
          })
      }
    } catch {
      // Proceed to create
    }

    return await pb.collection('atribuicoes').create<Atribuicao>(payload, {
      expand: 'fiscal,hospital,created_by',
    })
  },

  /**
   * Update atribuicao
   */
  async update(id: string, data: Partial<AtribuicaoFormData>): Promise<Atribuicao> {
    const payload: Record<string, unknown> = {}
    if (data.fiscal !== undefined) payload.fiscal = data.fiscal
    if (data.hospital !== undefined) payload.hospital = data.hospital
    if (data.prazo !== undefined) payload.prazo = data.prazo || null
    if (data.observacao !== undefined) payload.observacao = data.observacao.trim()

    return await pb.collection('atribuicoes').update<Atribuicao>(id, payload, {
      expand: 'fiscal,hospital,created_by',
    })
  },

  /**
   * Delete atribuicao
   */
  async delete(id: string): Promise<boolean> {
    return await pb.collection('atribuicoes').delete(id)
  },

  /**
   * Assign multiple hospitals to a single fiscal
   */
  async assignHospitalsToFiscal(
    fiscalId: string,
    hospitalIds: string[],
    createdBy?: string,
    observacao?: string,
    prazo?: string,
  ): Promise<Atribuicao[]> {
    const results: Atribuicao[] = []
    for (const hospId of hospitalIds) {
      const created = await this.create({
        fiscal: fiscalId,
        hospital: hospId,
        observacao: observacao || '',
        prazo: prazo || null,
      })
      results.push(created)
    }
    return results
  },

  /**
   * Computes the full detailed progress of an atribuicao list,
   * calculating whether each unit's vistoria has ALL checklist subitens completed.
   * Otimizado: reutiliza listas já carregadas para evitar N+1 queries.
   */
  async computeAtribuicoesProgress(
    atribuicoes: Atribuicao[],
    allCategoriasOrSubitens?: CategoriaVistoria[] | SubitemChecklist[],
    preloadedData?: {
      vistorias?: Vistoria[]
      vistoriaItens?: VistoriaItem[]
      subitens?: SubitemChecklist[]
      categorias?: CategoriaVistoria[]
    },
  ): Promise<AtribuicaoDetail[]> {
    // Se categorias ou subitens não foram fornecidos, carrega em paralelo UMA vez
    let allSubitens = preloadedData?.subitens
    let allCategories = preloadedData?.categorias

    if (!allSubitens || !allCategories) {
      const [fetchedSubitens, fetchedCategories] = await Promise.all([
        allSubitens ? Promise.resolve(allSubitens) : categoriasVistoriaService.getAllSubitens(),
        allCategories ? Promise.resolve(allCategories) : categoriasVistoriaService.getAll(),
      ])
      allSubitens = allSubitens || fetchedSubitens
      allCategories = allCategories || fetchedCategories
    }

    // Carrega vistorias e itens em lote UMA vez caso não tenham sido passados
    let allVistorias = preloadedData?.vistorias
    let allItens = preloadedData?.vistoriaItens

    if (!allVistorias) {
      try {
        allVistorias = await vistoriasService.getAll()
      } catch (err) {
        console.warn('Erro ao carregar vistorias em lote para progresso:', err)
        allVistorias = []
      }
    }

    if (!allItens) {
      try {
        allItens = await vistoriasService.getAllItens()
      } catch (err) {
        console.warn('Erro ao carregar itens de vistoria em lote para progresso:', err)
        allItens = []
      }
    }

    // Mapeamentos em memória O(1) para evitar qualquer loop assíncrono ou N+1
    const vistoriasByHospital = new Map<string, Vistoria>()
    for (const v of allVistorias) {
      // Se houver mais de uma, a mais recente (-created) prevalece
      if (v.hospital && !vistoriasByHospital.has(v.hospital)) {
        vistoriasByHospital.set(v.hospital, v)
      }
    }

    const itensByVistoria = new Map<string, VistoriaItem[]>()
    for (const item of allItens) {
      if (item.vistoria) {
        let list = itensByVistoria.get(item.vistoria)
        if (!list) {
          list = []
          itensByVistoria.set(item.vistoria, list)
        }
        list.push(item)
      }
    }

    // Cache de subitens relevantes por tipo de empreendimento
    const subitensByTipoCache = new Map<string, SubitemChecklist[]>()

    const details: AtribuicaoDetail[] = atribuicoes.map((atrib) => {
      const hospital = atrib.expand?.hospital || null
      if (!hospital) {
        return {
          atribuicao: atrib,
          hospital: null,
          vistoria: null,
          totalItensChecklist: 0,
          itensRespondidosCount: 0,
          isConcluida: false,
          percentual: 0,
        }
      }

      const hospTipo = (hospital.tipo || 'Hospital').trim().toLowerCase()
      const isHospitalType = hospTipo === 'hospital'

      let relevantSubitens = subitensByTipoCache.get(hospTipo)
      if (!relevantSubitens) {
        relevantSubitens = allSubitens!.filter((sub) => {
          const subTipo = (sub.tipo || (isHospitalType ? 'Hospital' : '')).trim().toLowerCase()
          return subTipo === hospTipo
        })

        // Se o tipo não tem subitens cadastrados mas tem categorias, usar as categorias
        if (relevantSubitens.length === 0) {
          const relevantCats = allCategories!.filter((cat) => {
            const catTipo = (cat.tipo || (isHospitalType ? 'Hospital' : '')).trim().toLowerCase()
            return catTipo === hospTipo
          })
          relevantSubitens = relevantCats.map((c, i) => ({
            id: c.id,
            categoria: c.id,
            tipo: c.tipo,
            ordem: i + 1,
            codigo: `${i + 1}.1`,
            descricao: c.nome,
            exigeArt: c.exigeArt ?? true,
            periodicidadeDias: c.periodicidadeDias,
            created: c.created,
            updated: c.updated,
          }))
        }

        subitensByTipoCache.set(hospTipo, relevantSubitens)
      }

      // Vistoria e itens resolvidos instantaneamente do mapa em memória
      const vistoria = vistoriasByHospital.get(hospital.id) || null
      const itens = vistoria ? itensByVistoria.get(vistoria.id) || [] : []

      const totalItens = relevantSubitens.length
      let respondidos = 0

      for (const sub of relevantSubitens) {
        const item = itens.find(
          (i) => i.subitem === sub.id || (!i.subitem && i.categoria === sub.categoria),
        )
        if (
          item &&
          (item.possuiSistema === 'Sim' ||
            item.possuiSistema === 'Não' ||
            item.possuiSistema === 'Não se aplica')
        ) {
          respondidos++
        }
      }

      const isConcluida =
        vistoria?.status === 'concluida' ||
        (totalItens > 0 ? respondidos >= totalItens : itens.length > 0)
      const percentual = totalItens > 0 ? Math.round((respondidos / totalItens) * 100) : 0

      return {
        atribuicao: atrib,
        hospital,
        vistoria,
        totalItensChecklist: totalItens,
        itensRespondidosCount: respondidos,
        isConcluida,
        percentual,
      }
    })

    return details
  },
}
