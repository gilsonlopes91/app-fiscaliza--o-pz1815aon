import pb from '@/lib/pocketbase/client'
import { Hospital } from './hospitais'
import { UserProfile } from './auth'
import { Vistoria, VistoriaItem, vistoriasService } from './vistorias'
import { CategoriaVistoria, categoriasVistoriaService } from './categoriasVistoria'

export interface Atribuicao {
  id: string
  fiscal: string
  hospital: string
  created_by?: string
  observacao?: string
  prazo?: string
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
  created_by?: string
  observacao?: string
  prazo?: string
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
 * Checks if a vistoria is concluded for a given hospital.
 * Rule: A vistoria is considered CONCLUÍDA when ALL checklist items of the hospital's type
 * have been answered (possuiSistema is filled as 'Sim' or 'Não' for every category).
 */
export function isVistoriaCompleta(
  itens: VistoriaItem[],
  categorias: CategoriaVistoria[],
): boolean {
  if (!categorias || categorias.length === 0) {
    // If no categories exist, consider complete if vistoria exists and has items
    return itens.length > 0
  }

  // Check if every category of this type has an item with possuiSistema = 'Sim' or 'Não'
  return categorias.every((cat) => {
    const item = itens.find((i) => i.categoria === cat.id)
    if (!item) return false
    return item.possuiSistema === 'Sim' || item.possuiSistema === 'Não'
  })
}

export const atribuicoesService = {
  /**
   * List all atribuicoes with expanded fiscal, hospital and creator
   */
  async getAll(): Promise<Atribuicao[]> {
    return await pb.collection('atribuicoes').getFullList<Atribuicao>({
      sort: '-created',
      expand: 'fiscal,hospital,created_by',
    })
  },

  /**
   * List atribuicoes assigned to a specific fiscal user
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
   * Assign multiple hospitals to a single fiscal
   */
  async assignHospitalsToFiscal(
    fiscalId: string,
    hospitalIds: string[],
    createdBy?: string,
    observacao?: string,
    prazo?: string,
  ): Promise<Atribuicao[]> {
    const createdList: Atribuicao[] = []

    for (const hospitalId of hospitalIds) {
      // Check if assignment already exists to avoid duplicate
      try {
        const existing = await pb.collection('atribuicoes').getList<Atribuicao>(1, 1, {
          filter: `fiscal = "${fiscalId}" && hospital = "${hospitalId}"`,
        })
        if (existing.items.length > 0) {
          createdList.push(existing.items[0])
          continue
        }
      } catch {
        // Continue to create
      }

      const record = await pb.collection('atribuicoes').create<Atribuicao>({
        fiscal: fiscalId,
        hospital: hospitalId,
        created_by: createdBy || pb.authStore.record?.id || '',
        observacao: observacao || '',
        prazo: prazo || null,
      })
      createdList.push(record)
    }

    return createdList
  },

  /**
   * Remove an atribuicao by id
   */
  async delete(id: string): Promise<boolean> {
    return await pb.collection('atribuicoes').delete(id)
  },

  /**
   * Computes the full detailed progress of an atribuicao list,
   * calculating whether each unit's vistoria has ALL checklist items completed.
   */
  async computeAtribuicoesProgress(
    atribuicoes: Atribuicao[],
    allCategorias?: CategoriaVistoria[],
  ): Promise<AtribuicaoDetail[]> {
    const categoriasList = allCategorias || (await categoriasVistoriaService.getAll())

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

        const relevantCats = categoriasList.filter((cat) => {
          const catTipo = (cat.tipo || (isHospitalType ? 'Hospital' : '')).trim().toLowerCase()
          return catTipo === hospTipo
        })

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

        const totalItens = relevantCats.length
        let respondidos = 0

        relevantCats.forEach((cat) => {
          const item = itens.find((i) => i.categoria === cat.id)
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
