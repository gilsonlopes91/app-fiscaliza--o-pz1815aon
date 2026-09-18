import pb from '@/lib/pocketbase/client'
import { estaOnline, hospitaisOffline } from '@/services/offlineSync'

export interface Hospital {
  id: string
  nome: string
  municipio: string
  cnes: string
  cnpj?: string
  cnpj_mantenedora?: string
  inscricao_estadual?: string
  cpf?: string
  ano_safra?: string
  tipo?: string
  endereco?: string
  cep?: string
  latitude?: string
  longitude?: string
  email?: string
  telefone?: string
  responsavel?: string
  cargo_responsavel?: string
  cpf_responsavel?: string
  created: string
  updated: string
}

export type HospitalFormData = {
  nome: string
  municipio: string
  cnes: string
  cnpj?: string
  cnpj_mantenedora?: string
  inscricao_estadual?: string
  cpf?: string
  ano_safra?: string
  tipo?: string
  endereco?: string
  cep?: string
  latitude?: string
  longitude?: string
  email?: string
  telefone?: string
  responsavel?: string
  cargo_responsavel?: string
  cpf_responsavel?: string
}

export const hospitaisService = {
  async getAll(): Promise<Hospital[]> {
    if (!estaOnline()) return hospitaisOffline()
    try {
      return await pb.collection('hospitais').getFullList<Hospital>({
        sort: '-created',
      })
    } catch (err) {
      const local = await hospitaisOffline()
      if (local.length > 0) return local
      throw err
    }
  },

  async getByTipo(tipo: string): Promise<Hospital[]> {
    const safeTipo = tipo.trim()

    if (!estaOnline()) {
      const local = await hospitaisOffline()
      return local.filter((h) => (h.tipo || '').trim() === safeTipo)
    }

    try {
      return await pb.collection('hospitais').getFullList<Hospital>({
        filter: `tipo = "${safeTipo}"`,
        sort: '-created',
      })
    } catch (err) {
      const local = await hospitaisOffline()
      const filtrados = local.filter((h) => (h.tipo || '').trim() === safeTipo)
      if (filtrados.length > 0) return filtrados
      throw err
    }
  },

  async getById(id: string): Promise<Hospital> {
    if (!estaOnline()) {
      const local = await hospitaisOffline()
      const achado = local.find((h) => h.id === id)
      if (achado) return achado
      throw new Error('Unidade não disponível offline. Sincronize antes de sair de área.')
    }

    try {
      return await pb.collection('hospitais').getOne<Hospital>(id)
    } catch (err) {
      const local = await hospitaisOffline()
      const achado = local.find((h) => h.id === id)
      if (achado) return achado
      throw err
    }
  },

  async create(data: HospitalFormData): Promise<Hospital> {
    const payload: Record<string, unknown> = {
      nome: data.nome.trim(),
      municipio: data.municipio.trim(),
      cnes: data.cnes.trim(),
      cnpj: data.cnpj?.trim() || '',
      cnpj_mantenedora: data.cnpj_mantenedora?.trim() || '',
      inscricao_estadual: data.inscricao_estadual?.trim() || '',
      cpf: data.cpf?.trim() || '',
      ano_safra: data.ano_safra?.trim() || '',
      tipo: data.tipo?.trim() || 'Hospital',
      endereco: data.endereco?.trim() || '',
      cep: data.cep?.trim() || '',
      latitude: data.latitude?.trim() || '',
      longitude: data.longitude?.trim() || '',
      email: data.email?.trim() || '',
      telefone: data.telefone?.trim() || '',
      responsavel: data.responsavel?.trim() || '',
      cargo_responsavel: data.cargo_responsavel?.trim() || '',
      cpf_responsavel: data.cpf_responsavel?.trim() || '',
    }
    const record = await pb.collection('hospitais').create<Hospital>(payload)
    return record
  },

  async update(id: string, data: Partial<HospitalFormData>): Promise<Hospital> {
    const payload: Record<string, unknown> = {}
    if (data.nome !== undefined) payload.nome = data.nome.trim()
    if (data.municipio !== undefined) payload.municipio = data.municipio.trim()
    if (data.cnes !== undefined) payload.cnes = data.cnes.trim()
    if (data.cnpj !== undefined) payload.cnpj = data.cnpj.trim()
    if (data.cnpj_mantenedora !== undefined) payload.cnpj_mantenedora = data.cnpj_mantenedora.trim()
    if (data.inscricao_estadual !== undefined)
      payload.inscricao_estadual = (data.inscricao_estadual || '').trim()
    if (data.cpf !== undefined) payload.cpf = (data.cpf || '').trim()
    if (data.ano_safra !== undefined) payload.ano_safra = (data.ano_safra || '').trim()
    if (data.cep !== undefined) payload.cep = (data.cep || '').trim()
    if (data.email !== undefined) payload.email = (data.email || '').trim()
    if (data.telefone !== undefined) payload.telefone = (data.telefone || '').trim()
    if (data.cargo_responsavel !== undefined)
      payload.cargo_responsavel = (data.cargo_responsavel || '').trim()
    if (data.tipo !== undefined) payload.tipo = data.tipo?.trim() || 'Hospital'
    if (data.endereco !== undefined) payload.endereco = data.endereco.trim()
    if (data.latitude !== undefined) payload.latitude = (data.latitude || '').trim()
    if (data.longitude !== undefined) payload.longitude = (data.longitude || '').trim()
    if (data.responsavel !== undefined) payload.responsavel = data.responsavel.trim()
    if (data.cpf_responsavel !== undefined) payload.cpf_responsavel = data.cpf_responsavel.trim()

    const record = await pb.collection('hospitais').update<Hospital>(id, payload)
    return record
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('hospitais').delete(id)
  },
}
