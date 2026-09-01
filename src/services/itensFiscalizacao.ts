import pb from '@/lib/pocketbase/client'

export type ItemFiscalizacaoStatus = 'Conforme' | 'Não Conforme'

export interface ItemFiscalizacao {
  id: string
  hospital: string
  nome: string
  categoria: string
  descricao?: string
  status: ItemFiscalizacaoStatus
  observacao?: string
  created: string
  updated: string
}

export type ItemFiscalizacaoFormData = {
  hospital: string
  nome: string
  categoria: string
  descricao?: string
  status: ItemFiscalizacaoStatus
  observacao?: string
}

export const itensFiscalizacaoService = {
  async getByHospital(hospitalId: string): Promise<ItemFiscalizacao[]> {
    if (!hospitalId) return []
    const records = await pb.collection('itens_fiscalizacao').getFullList<ItemFiscalizacao>({
      filter: `hospital = "${hospitalId}"`,
      sort: 'categoria,nome',
    })
    return records
  },

  async create(data: ItemFiscalizacaoFormData): Promise<ItemFiscalizacao> {
    const payload: Record<string, unknown> = {
      hospital: data.hospital,
      nome: data.nome.trim(),
      categoria: data.categoria.trim(),
      descricao: data.descricao?.trim() || '',
      status: data.status,
      observacao: data.observacao?.trim() || '',
    }
    return await pb.collection('itens_fiscalizacao').create<ItemFiscalizacao>(payload)
  },

  async update(id: string, data: Partial<ItemFiscalizacaoFormData>): Promise<ItemFiscalizacao> {
    const payload: Record<string, unknown> = {}
    if (data.nome !== undefined) payload.nome = data.nome.trim()
    if (data.categoria !== undefined) payload.categoria = data.categoria.trim()
    if (data.descricao !== undefined) payload.descricao = data.descricao.trim()
    if (data.status !== undefined) payload.status = data.status
    if (data.observacao !== undefined) payload.observacao = data.observacao.trim()
    if (data.hospital !== undefined) payload.hospital = data.hospital

    return await pb.collection('itens_fiscalizacao').update<ItemFiscalizacao>(id, payload)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('itens_fiscalizacao').delete(id)
  },

  async createBatch(
    items: Array<{
      hospital: string
      nome: string
      categoria: string
      descricao?: string
      status?: ItemFiscalizacaoStatus
      observacao?: string
    }>,
  ): Promise<ItemFiscalizacao[]> {
    const createdList: ItemFiscalizacao[] = []
    for (const item of items) {
      const record = await this.create({
        hospital: item.hospital,
        nome: item.nome,
        categoria: item.categoria,
        descricao: item.descricao || '',
        status: item.status || 'Conforme',
        observacao: item.observacao || '',
      })
      createdList.push(record)
    }
    return createdList
  },
}
