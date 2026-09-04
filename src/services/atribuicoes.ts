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
): boolean {
  if (subitensChecklist.length === 0) {
    return itens.length > 0
  }
  const respondidos = subitensChecklist.filter((sub) => {
    const item = itens.find(
      (i) => i.subitem === sub.id || (!i.subitem && i.categoria === sub.categoria),
    )
    return item && (item.possuiSistema === 'Sim' || item.possuiSistema === 'Não')
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
   */
  async computeAtribuicoesProgress(
    atribuicoes: Atribuicao[],
    allCategoriasOrSubitens?: CategoriaVistoria[] | SubitemChecklist[],
  ): Promise<AtribuicaoDetail[]> {
    // Carrega tanto categorias quanto subitens para contagem precisa de 2 níveis
    const [allSubitens, allCategories] = await Promise.all([
      categoriasVistoriaService.getAllSubitens(),
      categoriasVistoriaService.getAll(),
    ])

    const details = await Promise.all(
      atribuicoes.map(async (atrib) => {
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

        // Encontrar os subitens do tipo
        let relevantSubitens = allSubitens.filter((sub) => {
          const subTipo = (sub.tipo || (isHospitalType ? 'Hospital' : '')).trim().toLowerCase()
          return subTipo === hospTipo
        })

        // Se o tipo não tem subitens cadastrados mas tem categorias, usar as categorias
        if (relevantSubitens.length === 0) {
          const relevantCats = allCategories.filter((cat) => {
            const catTipo = (cat.tipo || (isHospitalType ? 'Hospital' : '')).trim().toLowerCase()
            return catTipo === hospTipo
          })
          // Fallback se não há subitens
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

        // Fetch vistoria & items for this hospital
        let vistoria: Vistoria | null = null
        let itens: VistoriaItem[] = []

        try {
          vistoria = await vistoriasService.getByHospitalId(hospital.id)
          if (vistoria) {
            itens = await vistoriasService.getItensByVistoria(vistoria.id)
          }
        } catch (e) {
          console.warn('Erro ao carregar vistoria para progresso:', e)
        }

        const totalItens = relevantSubitens.length
        let respondidos = 0

        relevantSubitens.forEach((sub) => {
          const item = itens.find(
            (i) => i.subitem === sub.id || (!i.subitem && i.categoria === sub.categoria),
          )
          if (item && (item.possuiSistema === 'Sim' || item.possuiSistema === 'Não')) {
            respondidos++
          }
        })

        const isConcluida = totalItens > 0 ? respondidos >= totalItens : itens.length > 0
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
      }),
    )

    return details
  },
}
