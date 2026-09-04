import pb from '@/lib/pocketbase/client'

/**
 * Item Principal (Nível 1) - Agrupador de tema técnico (Ex: 1. Ar-condicionado, 2. Caldeiras...)
 * Serve apenas como título / agrupador na tela, sem campos próprios de marcação.
 */
export interface CategoriaVistoria {
  id: string
  nome: string
  tipo?: string
  ordem?: number
  // Campos legados mantidos para retrocompatibilidade
  exigeArt?: boolean
  periodicidadeDias?: number | null
  created: string
  updated: string
}

export interface CategoriaVistoriaFormData {
  nome: string
  tipo?: string
  ordem?: number
  exigeArt?: boolean
  periodicidadeDias?: number | null
}

/**
 * Subitem do Checklist (Nível 2) - Atividade fiscalizada (Ex: 1.1, 1.2...)
 * É aqui que ficam a descrição, 'Exige ART' (Sim/Não) e 'Periodicidade' (em dias).
 */
export interface SubitemChecklist {
  id: string
  categoria: string
  tipo?: string
  ordem?: number
  codigo?: string // Ex: "1.1", "1.2"
  descricao: string
  exigeArt: boolean
  periodicidadeDias?: number | null
  created: string
  updated: string
  expand?: {
    categoria?: CategoriaVistoria
  }
}

export interface SubitemChecklistFormData {
  categoria: string
  tipo?: string
  ordem?: number
  codigo?: string
  descricao: string
  exigeArt: boolean
  periodicidadeDias?: number | null
}

export const categoriasVistoriaService = {
  /**
   * Retorna todos os itens principais (agrupadores) ordenados
   */
  async getAll(): Promise<CategoriaVistoria[]> {
    const records = await pb.collection('categorias_vistoria').getFullList<CategoriaVistoria>({
      sort: 'ordem,created',
    })
    return records.map((record, idx) => ({
      ...record,
      tipo: record.tipo || 'Hospital',
      ordem: record.ordem && record.ordem > 0 ? record.ordem : idx + 1,
      periodicidadeDias:
        record.periodicidadeDias && record.periodicidadeDias > 0 ? record.periodicidadeDias : null,
    }))
  },

  /**
   * Retorna itens principais filtrados por tipo de empreendimento
   */
  async getByTipo(tipo: string): Promise<CategoriaVistoria[]> {
    const safeTipo = tipo.trim()
    const records = await pb.collection('categorias_vistoria').getFullList<CategoriaVistoria>({
      filter: `tipo = "${safeTipo}"`,
      sort: 'ordem,created',
    })
    return records.map((record, idx) => ({
      ...record,
      tipo: record.tipo || safeTipo,
      ordem: record.ordem && record.ordem > 0 ? record.ordem : idx + 1,
      periodicidadeDias:
        record.periodicidadeDias && record.periodicidadeDias > 0 ? record.periodicidadeDias : null,
    }))
  },

  async getById(id: string): Promise<CategoriaVistoria> {
    const record = await pb.collection('categorias_vistoria').getOne<CategoriaVistoria>(id)
    return {
      ...record,
      periodicidadeDias:
        record.periodicidadeDias && record.periodicidadeDias > 0 ? record.periodicidadeDias : null,
    }
  },

  /**
   * Cria um item principal (agrupador)
   */
  async create(data: CategoriaVistoriaFormData): Promise<CategoriaVistoria> {
    const payload: Record<string, unknown> = {
      nome: data.nome.trim(),
      tipo: data.tipo?.trim() || 'Hospital',
      ordem: data.ordem !== undefined && data.ordem > 0 ? Math.floor(data.ordem) : 1,
      exigeArt: Boolean(data.exigeArt),
      periodicidadeDias:
        data.periodicidadeDias && data.periodicidadeDias > 0
          ? Math.floor(data.periodicidadeDias)
          : null,
    }
    const record = await pb.collection('categorias_vistoria').create<CategoriaVistoria>(payload)
    return {
      ...record,
      tipo: record.tipo || data.tipo?.trim() || 'Hospital',
      periodicidadeDias:
        record.periodicidadeDias && record.periodicidadeDias > 0 ? record.periodicidadeDias : null,
    }
  },

  async update(id: string, data: Partial<CategoriaVistoriaFormData>): Promise<CategoriaVistoria> {
    const payload: Record<string, unknown> = {}
    if (data.nome !== undefined) payload.nome = data.nome.trim()
    if (data.tipo !== undefined) payload.tipo = data.tipo.trim()
    if (data.ordem !== undefined) payload.ordem = Math.floor(data.ordem)
    if (data.exigeArt !== undefined) payload.exigeArt = Boolean(data.exigeArt)
    if (data.periodicidadeDias !== undefined) {
      payload.periodicidadeDias =
        data.periodicidadeDias && data.periodicidadeDias > 0
          ? Math.floor(data.periodicidadeDias)
          : null
    }

    const record = await pb.collection('categorias_vistoria').update<CategoriaVistoria>(id, payload)
    return {
      ...record,
      tipo: record.tipo || 'Hospital',
      periodicidadeDias:
        record.periodicidadeDias && record.periodicidadeDias > 0 ? record.periodicidadeDias : null,
    }
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('categorias_vistoria').delete(id)
  },

  // ==========================================
  // SUBITENS CHECKLIST (NÍVEL 2)
  // ==========================================

  /**
   * Retorna todos os subitens de checklist
   */
  async getAllSubitens(): Promise<SubitemChecklist[]> {
    const records = await pb.collection('subitens_checklist').getFullList<SubitemChecklist>({
      sort: 'ordem,created',
      expand: 'categoria',
    })
    return records.map((record) => ({
      ...record,
      periodicidadeDias:
        record.periodicidadeDias && record.periodicidadeDias > 0 ? record.periodicidadeDias : null,
    }))
  },

  /**
   * Retorna subitens filtrados por tipo de empreendimento
   */
  async getSubitensByTipo(tipo: string): Promise<SubitemChecklist[]> {
    const safeTipo = tipo.trim()
    const records = await pb.collection('subitens_checklist').getFullList<SubitemChecklist>({
      filter: `tipo = "${safeTipo}"`,
      sort: 'ordem,created',
      expand: 'categoria',
    })
    return records.map((record) => ({
      ...record,
      periodicidadeDias:
        record.periodicidadeDias && record.periodicidadeDias > 0 ? record.periodicidadeDias : null,
    }))
  },

  /**
   * Retorna subitens de um item principal específico
   */
  async getSubitensByCategoria(categoriaId: string): Promise<SubitemChecklist[]> {
    const records = await pb.collection('subitens_checklist').getFullList<SubitemChecklist>({
      filter: `categoria = "${categoriaId}"`,
      sort: 'ordem,created',
      expand: 'categoria',
    })
    return records.map((record) => ({
      ...record,
      periodicidadeDias:
        record.periodicidadeDias && record.periodicidadeDias > 0 ? record.periodicidadeDias : null,
    }))
  },

  /**
   * Cria um novo subitem
   */
  async createSubitem(data: SubitemChecklistFormData): Promise<SubitemChecklist> {
    const payload: Record<string, unknown> = {
      categoria: data.categoria,
      tipo: data.tipo?.trim() || 'Hospital',
      ordem: data.ordem !== undefined && data.ordem > 0 ? Math.floor(data.ordem) : 1,
      codigo: data.codigo?.trim() || '',
      descricao: data.descricao.trim(),
      exigeArt: Boolean(data.exigeArt),
      periodicidadeDias:
        data.periodicidadeDias && data.periodicidadeDias > 0
          ? Math.floor(data.periodicidadeDias)
          : null,
    }
    const record = await pb.collection('subitens_checklist').create<SubitemChecklist>(payload, {
      expand: 'categoria',
    })
    return {
      ...record,
      periodicidadeDias:
        record.periodicidadeDias && record.periodicidadeDias > 0 ? record.periodicidadeDias : null,
    }
  },

  /**
   * Atualiza um subitem existente
   */
  async updateSubitem(
    id: string,
    data: Partial<SubitemChecklistFormData>,
  ): Promise<SubitemChecklist> {
    const payload: Record<string, unknown> = {}
    if (data.categoria !== undefined) payload.categoria = data.categoria
    if (data.tipo !== undefined) payload.tipo = data.tipo.trim()
    if (data.ordem !== undefined) payload.ordem = Math.floor(data.ordem)
    if (data.codigo !== undefined) payload.codigo = data.codigo.trim()
    if (data.descricao !== undefined) payload.descricao = data.descricao.trim()
    if (data.exigeArt !== undefined) payload.exigeArt = Boolean(data.exigeArt)
    if (data.periodicidadeDias !== undefined) {
      payload.periodicidadeDias =
        data.periodicidadeDias && data.periodicidadeDias > 0
          ? Math.floor(data.periodicidadeDias)
          : null
    }

    const record = await pb.collection('subitens_checklist').update<SubitemChecklist>(id, payload, {
      expand: 'categoria',
    })
    return {
      ...record,
      periodicidadeDias:
        record.periodicidadeDias && record.periodicidadeDias > 0 ? record.periodicidadeDias : null,
    }
  },

  /**
   * Exclui um subitem
   */
  async deleteSubitem(id: string): Promise<boolean> {
    return await pb.collection('subitens_checklist').delete(id)
  },
}
