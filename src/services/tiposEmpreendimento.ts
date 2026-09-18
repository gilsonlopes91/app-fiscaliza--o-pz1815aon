import pb from '@/lib/pocketbase/client'
import { estaOnline, tiposOffline } from '@/services/offlineSync'

export interface TipoEmpreendimento {
  id: string
  nome: string
  icone?: string
  descricao?: string
  created: string
  updated: string
}

export interface TipoEmpreendimentoFormData {
  nome: string
  icone?: string
  descricao?: string
}

export const tiposEmpreendimentoService = {
  async getAll(): Promise<TipoEmpreendimento[]> {
    if (!estaOnline()) return tiposOffline<TipoEmpreendimento>()
    try {
      return await pb.collection('tipos_empreendimento').getFullList<TipoEmpreendimento>({
        sort: 'nome',
      })
    } catch (err) {
      const local = await tiposOffline<TipoEmpreendimento>()
      if (local.length > 0) return local
      throw err
    }
  },

  async getById(id: string): Promise<TipoEmpreendimento> {
    const record = await pb.collection('tipos_empreendimento').getOne<TipoEmpreendimento>(id)
    return record
  },

  async create(data: TipoEmpreendimentoFormData): Promise<TipoEmpreendimento> {
    const payload = {
      nome: data.nome.trim(),
      icone: data.icone?.trim() || 'Building2',
      descricao: data.descricao?.trim() || '',
    }
    const record = await pb.collection('tipos_empreendimento').create<TipoEmpreendimento>(payload)
    return record
  },

  async update(id: string, data: Partial<TipoEmpreendimentoFormData>): Promise<TipoEmpreendimento> {
    const payload: Record<string, unknown> = {}
    if (data.nome !== undefined) payload.nome = data.nome.trim()
    if (data.icone !== undefined) payload.icone = data.icone.trim()
    if (data.descricao !== undefined) payload.descricao = data.descricao.trim()

    const record = await pb
      .collection('tipos_empreendimento')
      .update<TipoEmpreendimento>(id, payload)
    return record
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('tipos_empreendimento').delete(id)
  },
}
