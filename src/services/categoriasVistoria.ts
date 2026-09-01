import pb from '@/lib/pocketbase/client'

export interface CategoriaVistoria {
  id: string
  nome: string
  tipo?: string
  exigeArt: boolean
  periodicidadeDias?: number | null
  created: string
  updated: string
}

export interface CategoriaVistoriaFormData {
  nome: string
  tipo?: string
  exigeArt: boolean
  periodicidadeDias?: number | null
}

export const categoriasVistoriaService = {
  async getAll(): Promise<CategoriaVistoria[]> {
    const records = await pb.collection('categorias_vistoria').getFullList<CategoriaVistoria>({
      sort: 'created',
    })
    return records.map((record) => ({
      ...record,
      tipo: record.tipo || 'Hospital',
      // Normalize periodicidadeDias: null if <= 0 or not provided
      periodicidadeDias:
        record.periodicidadeDias && record.periodicidadeDias > 0 ? record.periodicidadeDias : null,
    }))
  },

  async getByTipo(tipo: string): Promise<CategoriaVistoria[]> {
    const safeTipo = tipo.trim()
    const records = await pb.collection('categorias_vistoria').getFullList<CategoriaVistoria>({
      filter: `tipo = "${safeTipo}"`,
      sort: 'created',
    })
    return records.map((record) => ({
      ...record,
      tipo: record.tipo || safeTipo,
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

  async create(data: CategoriaVistoriaFormData): Promise<CategoriaVistoria> {
    const payload: Record<string, unknown> = {
      nome: data.nome.trim(),
      tipo: data.tipo?.trim() || 'Hospital',
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
}
