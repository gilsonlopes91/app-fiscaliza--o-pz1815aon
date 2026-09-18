import pb from '@/lib/pocketbase/client'
import * as db from '@/lib/offlineDb'
import type { Hospital, HospitalFormData } from '@/services/hospitais'
import type { CategoriaVistoria, SubitemChecklist } from '@/services/categoriasVistoria'
import type { Vistoria, VistoriaItem, VistoriaItemFormData } from '@/services/vistorias'
import type { Atribuicao } from '@/services/atribuicoes'

/**
 * Sincronização para trabalho em campo sem internet.
 *
 * "Preparar para campo" baixa as unidades do fiscal, o checklist e as vistorias
 * para o celular. Fora de área, o app lê desse banco local e guarda cada
 * resposta (e foto) numa fila, que é enviada sozinha quando a rede volta.
 */

export interface EntradaOutbox {
  id?: number
  tipo:
    | 'criar_hospital'
    | 'atualizar_hospital'
    | 'criar_vistoria'
    | 'salvar_item'
    | 'caracterizacao'
  criadoEm: string
  vistoriaId: string
  hospitalId: string
  dadosHospital?: HospitalFormData
  categoriaId?: string
  subitemId?: string
  itemId?: string
  form?: VistoriaItemFormData
  subitemInfo?: { exigeArt?: boolean; periodicidadeDias?: number | null }
  caracterizacao?: unknown
  fotosIds?: number[]
  fotosRemovidas?: string[]
  fiscalId?: string
  tentativas?: number
  ultimoErro?: string
}

export interface ResumoOffline {
  ultimaSync: string | null
  hospitais: number
  temas: number
  subitens: number
  vistorias: number
  itens: number
  pendentes: number
  fotosPendentes: number
  espaco: { usado: number; total: number } | null
}

export function estaOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

/** Id provisório usado enquanto o registro não foi para o servidor. */
export function ehIdLocal(id?: string | null): boolean {
  return !!id && id.startsWith('local_')
}

function novoIdLocal(prefixo: string): string {
  return `local_${prefixo}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================
// LEITURA DO BANCO LOCAL
// ============================================================

export async function hospitaisOffline(): Promise<Hospital[]> {
  return db.dbGetAll<Hospital>('hospitais')
}

export async function categoriasOffline(): Promise<CategoriaVistoria[]> {
  return db.dbGetAll<CategoriaVistoria>('categorias')
}

export async function subitensOffline(): Promise<SubitemChecklist[]> {
  return db.dbGetAll<SubitemChecklist>('subitens')
}

export async function vistoriasOffline(): Promise<Vistoria[]> {
  return db.dbGetAll<Vistoria>('vistorias')
}

/** Atribuições e tipos ficam no armazenamento simples, por serem listas curtas. */
export async function atribuicoesOffline(): Promise<Atribuicao[]> {
  return (await db.metaGet<Atribuicao[]>('atribuicoes')) || []
}

export async function tiposOffline<T>(): Promise<T[]> {
  return (await db.metaGet<T[]>('tipos')) || []
}

export async function itensOffline(vistoriaId?: string): Promise<VistoriaItem[]> {
  const todos = await db.dbGetAll<VistoriaItem>('vistoria_itens')
  return vistoriaId ? todos.filter((i) => i.vistoria === vistoriaId) : todos
}

/** Grava/atualiza um registro no cache local (usado após salvar online também). */
export async function guardarLocal(store: db.NomeStore, valor: unknown): Promise<void> {
  try {
    await db.dbPut(store, valor)
  } catch (err) {
    console.warn('Não foi possível gravar no cache offline:', err)
  }
}

// ============================================================
// SINCRONIZAÇÃO: SERVIDOR -> CELULAR
// ============================================================

export async function sincronizarParaCampo(opcoes: {
  fiscalId: string
  isAdmin?: boolean
  onProgress?: (mensagem: string) => void
}): Promise<ResumoOffline> {
  const { fiscalId, isAdmin, onProgress } = opcoes

  if (!estaOnline()) {
    throw new Error('Sem conexão para sincronizar. Conecte-se e tente novamente.')
  }

  await db.solicitarArmazenamentoPersistente()

  // 1. Unidades atribuídas ao fiscal
  onProgress?.('Buscando unidades atribuídas...')
  let hospitaisAlvo: Hospital[] = []

  const atribuicoes = await pb.collection('atribuicoes').getFullList<Atribuicao>({
    filter: `fiscal = "${fiscalId}"`,
    expand: 'hospital',
  })

  const idsAtribuidos = new Set(atribuicoes.map((a) => a.hospital).filter(Boolean))

  onProgress?.('Baixando cadastros...')
  const todosHospitais = await pb.collection('hospitais').getFullList<Hospital>({
    sort: 'nome',
  })

  hospitaisAlvo = todosHospitais.filter((h) => idsAtribuidos.has(h.id))

  // Administrador sem atribuição formal leva todas as unidades
  if (hospitaisAlvo.length === 0 && isAdmin) {
    hospitaisAlvo = todosHospitais
  }

  // 2. Checklist completo (é leve e garante que qualquer tipo abra offline)
  onProgress?.('Baixando checklists...')
  const [categorias, subitens] = await Promise.all([
    pb.collection('categorias_vistoria').getFullList<CategoriaVistoria>({ sort: 'ordem,created' }),
    pb.collection('subitens_checklist').getFullList<SubitemChecklist>({ sort: 'ordem,created' }),
  ])

  // 3. Vistorias e respostas das unidades sincronizadas
  onProgress?.('Baixando vistorias e respostas...')
  const idsHospitais = new Set(hospitaisAlvo.map((h) => h.id))

  const todasVistorias = await pb.collection('vistorias').getFullList<Vistoria>({
    sort: '-created',
  })
  const vistorias = todasVistorias.filter((v) => idsHospitais.has(v.hospital))
  const idsVistorias = new Set(vistorias.map((v) => v.id))

  const todosItens = await pb.collection('vistoria_itens').getFullList<VistoriaItem>({})
  const itens = todosItens.filter((i) => idsVistorias.has(i.vistoria))

  // 4. Grava tudo no banco local (a fila de envio NÃO é tocada)
  onProgress?.('Gravando no celular...')
  await Promise.all([
    db.dbClear('hospitais'),
    db.dbClear('categorias'),
    db.dbClear('subitens'),
    db.dbClear('vistorias'),
    db.dbClear('vistoria_itens'),
  ])

  await Promise.all([
    db.dbPutMany('hospitais', hospitaisAlvo),
    db.dbPutMany('categorias', categorias),
    db.dbPutMany('subitens', subitens),
    db.dbPutMany('vistorias', vistorias),
    db.dbPutMany('vistoria_itens', itens),
  ])

  // Listas curtas: atribuições do fiscal e catálogo de tipos
  const tipos = await pb.collection('tipos_empreendimento').getFullList({ sort: 'nome' })
  await db.metaSet('atribuicoes', atribuicoes)
  await db.metaSet('tipos', tipos)

  await db.metaSet('ultimaSync', new Date().toISOString())
  await db.metaSet('fiscalId', fiscalId)

  return lerResumoOffline()
}

export async function lerResumoOffline(): Promise<ResumoOffline> {
  const [ultimaSync, hospitais, temas, subitens, vistorias, itens, pendentes, fotosPendentes] =
    await Promise.all([
      db.metaGet<string>('ultimaSync'),
      db.dbCount('hospitais'),
      db.dbCount('categorias'),
      db.dbCount('subitens'),
      db.dbCount('vistorias'),
      db.dbCount('vistoria_itens'),
      db.dbCount('outbox'),
      db.dbCount('fotos'),
    ])

  const espaco = await db.espacoArmazenamento()

  return {
    ultimaSync,
    hospitais,
    temas,
    subitens,
    vistorias,
    itens,
    pendentes,
    fotosPendentes,
    espaco,
  }
}

export async function limparDadosOffline(): Promise<void> {
  await Promise.all([
    db.dbClear('hospitais'),
    db.dbClear('categorias'),
    db.dbClear('subitens'),
    db.dbClear('vistorias'),
    db.dbClear('vistoria_itens'),
  ])
  await db.metaSet('ultimaSync', null)
}

// ============================================================
// FILA DE ENVIO: CELULAR -> SERVIDOR
// ============================================================

export async function contarPendencias(): Promise<number> {
  return db.dbCount('outbox')
}

/**
 * Cadastra uma unidade nova direto no celular, sem rede. Ela já aparece na
 * lista e aceita fiscalização; ao sincronizar, vira um registro de verdade.
 */
export async function criarHospitalOffline(
  dados: HospitalFormData,
  fiscalId?: string,
): Promise<Hospital> {
  const agora = new Date().toISOString()
  const hospital: Hospital = {
    ...(dados as unknown as Hospital),
    id: novoIdLocal('hosp'),
    created: agora,
    updated: agora,
  }

  await db.dbPut('hospitais', hospital)
  await db.dbPut('outbox', {
    tipo: 'criar_hospital',
    criadoEm: agora,
    vistoriaId: '',
    hospitalId: hospital.id,
    dadosHospital: dados,
    fiscalId,
  } as EntradaOutbox)

  return hospital
}

/** Atualiza uma unidade no celular e agenda o envio. */
export async function atualizarHospitalOffline(
  id: string,
  dados: Partial<HospitalFormData>,
): Promise<Hospital> {
  const locais = await db.dbGetAll<Hospital>('hospitais')
  const atual = locais.find((h) => h.id === id)
  const atualizado: Hospital = {
    ...(atual as Hospital),
    ...(dados as unknown as Hospital),
    id,
    updated: new Date().toISOString(),
  }

  await db.dbPut('hospitais', atualizado)
  await db.dbPut('outbox', {
    tipo: 'atualizar_hospital',
    criadoEm: new Date().toISOString(),
    vistoriaId: '',
    hospitalId: id,
    dadosHospital: dados as HospitalFormData,
  } as EntradaOutbox)

  return atualizado
}

/** Cria uma vistoria provisória no celular quando não há rede. */
export async function criarVistoriaOffline(hospitalId: string): Promise<Vistoria> {
  const agora = new Date().toISOString()
  const vistoria: Vistoria = {
    id: novoIdLocal('vist'),
    hospital: hospitalId,
    status: 'em_andamento',
    created: agora,
    updated: agora,
  }

  await db.dbPut('vistorias', vistoria)
  await db.dbPut('outbox', {
    tipo: 'criar_vistoria',
    criadoEm: agora,
    vistoriaId: vistoria.id,
    hospitalId,
  } as EntradaOutbox)

  return vistoria
}

/**
 * Guarda uma resposta do checklist (com fotos) para envio posterior e devolve
 * o item como ele ficará na tela enquanto o fiscal segue trabalhando.
 */
export async function enfileirarItem(params: {
  vistoriaId: string
  hospitalId: string
  categoriaId: string
  subitemId?: string
  itemId?: string
  form: VistoriaItemFormData
  subitemInfo: { exigeArt?: boolean; periodicidadeDias?: number | null }
  situacao: string | null
  novasFotos?: File[]
  fotosRemovidas?: string[]
  fiscalId?: string
}): Promise<VistoriaItem> {
  const agora = new Date().toISOString()

  // 1. Guarda as fotos como arquivos no banco local
  const fotosIds: number[] = []
  for (const arquivo of params.novasFotos || []) {
    try {
      const chave = await db.dbPut('fotos', { blob: arquivo, nome: arquivo.name, criadoEm: agora })
      fotosIds.push(Number(chave))
    } catch (err) {
      console.error('Não foi possível guardar a foto offline:', err)
      throw new Error(
        'Não há espaço no aparelho para guardar a foto. Libere espaço ou sincronize antes de continuar.',
      )
    }
  }

  // 2. Registra a operação na fila
  await db.dbPut('outbox', {
    tipo: 'salvar_item',
    criadoEm: agora,
    vistoriaId: params.vistoriaId,
    hospitalId: params.hospitalId,
    categoriaId: params.categoriaId,
    subitemId: params.subitemId,
    itemId: params.itemId,
    form: params.form,
    subitemInfo: params.subitemInfo,
    fotosIds,
    fotosRemovidas: params.fotosRemovidas,
    fiscalId: params.fiscalId,
  } as EntradaOutbox)

  // 3. Atualiza o cache local para a tela continuar coerente
  const existentes = await db.dbGetAll<VistoriaItem>('vistoria_itens')
  const anterior = existentes.find(
    (i) =>
      (params.subitemId && i.subitem === params.subitemId && i.vistoria === params.vistoriaId) ||
      (!params.subitemId && i.categoria === params.categoriaId && i.vistoria === params.vistoriaId),
  )

  const item: VistoriaItem = {
    ...(anterior || ({} as VistoriaItem)),
    id: anterior?.id || params.itemId || novoIdLocal('item'),
    vistoria: params.vistoriaId,
    hospital: params.hospitalId,
    categoria: params.categoriaId,
    subitem: params.subitemId,
    ...params.form,
    situacaoCalculada: params.situacao as VistoriaItem['situacaoCalculada'],
    fotos: anterior?.fotos || [],
    created: anterior?.created || agora,
    updated: agora,
  }

  await db.dbPut('vistoria_itens', item)
  return item
}

export async function enfileirarCaracterizacao(
  vistoriaId: string,
  hospitalId: string,
  caracterizacao: unknown,
): Promise<void> {
  await db.dbPut('outbox', {
    tipo: 'caracterizacao',
    criadoEm: new Date().toISOString(),
    vistoriaId,
    hospitalId,
    caracterizacao,
  } as EntradaOutbox)

  const vistorias = await db.dbGetAll<Vistoria>('vistorias')
  const atual = vistorias.find((v) => v.id === vistoriaId)
  if (atual) {
    await db.dbPut('vistorias', { ...atual, caracterizacao })
  }
}

export interface ResultadoEnvio {
  enviados: number
  falhas: number
  mensagemErro?: string
}

/**
 * Envia a fila ao servidor, na ordem em que foi criada. Entradas que falham
 * permanecem na fila com o registro do erro, para nova tentativa.
 */
export async function enviarPendencias(
  onProgress?: (atual: number, total: number) => void,
): Promise<ResultadoEnvio> {
  if (!estaOnline()) {
    return { enviados: 0, falhas: 0, mensagemErro: 'Sem conexão.' }
  }

  const fila = (await db.dbGetAll<EntradaOutbox>('outbox')).sort(
    (a, b) => (a.id || 0) - (b.id || 0),
  )

  if (fila.length === 0) return { enviados: 0, falhas: 0 }

  // Import dinâmico evita dependência circular entre os dois módulos
  const { vistoriasService } = await import('@/services/vistorias')
  const { hospitaisService } = await import('@/services/hospitais')

  const mapaVistorias = new Map<string, string>()
  const mapaHospitais = new Map<string, string>()

  const resolverHospital = (id: string) => (ehIdLocal(id) ? mapaHospitais.get(id) || null : id)
  let enviados = 0
  let falhas = 0
  let mensagemErro: string | undefined

  for (let i = 0; i < fila.length; i++) {
    const entrada = fila[i]
    onProgress?.(i + 1, fila.length)

    try {
      if (entrada.tipo === 'criar_hospital') {
        const criado = await hospitaisService.create(entrada.dadosHospital!)
        mapaHospitais.set(entrada.hospitalId, criado.id)

        // Substitui o registro provisório pelo definitivo no cache local
        await db.dbDelete('hospitais', entrada.hospitalId)
        await db.dbPut('hospitais', criado)

        // Vincula ao fiscal que cadastrou, para a unidade aparecer na lista dele
        if (entrada.fiscalId) {
          try {
            await pb.collection('atribuicoes').create({
              fiscal: entrada.fiscalId,
              hospital: criado.id,
              created_by: entrada.fiscalId,
              observacao: 'Unidade cadastrada em campo pelo fiscal (modo offline)',
            })
          } catch (e) {
            console.warn('Não foi possível vincular a unidade ao fiscal:', e)
          }
        }
      } else if (entrada.tipo === 'atualizar_hospital') {
        const alvo = resolverHospital(entrada.hospitalId)
        if (!alvo) throw new Error('Unidade correspondente ainda não foi criada no servidor.')
        await hospitaisService.update(alvo, entrada.dadosHospital || {})
      } else if (entrada.tipo === 'criar_vistoria') {
        const hospitalReal = resolverHospital(entrada.hospitalId)
        if (!hospitalReal) {
          throw new Error('Unidade correspondente ainda não foi criada no servidor.')
        }
        const criada = await vistoriasService.getOrCreateForHospital(hospitalReal)
        mapaVistorias.set(entrada.vistoriaId, criada.id)
      } else if (entrada.tipo === 'salvar_item') {
        const vistoriaReal = ehIdLocal(entrada.vistoriaId)
          ? mapaVistorias.get(entrada.vistoriaId)
          : entrada.vistoriaId

        const hospitalReal = resolverHospital(entrada.hospitalId)

        if (!vistoriaReal || !hospitalReal) {
          throw new Error('Vistoria ou unidade correspondente ainda não existe no servidor.')
        }

        const arquivos: File[] = []
        for (const fotoId of entrada.fotosIds || []) {
          const registro = await db.dbGet<{ blob: File }>('fotos', fotoId)
          if (registro?.blob) arquivos.push(registro.blob)
        }

        await vistoriasService.saveItem(
          vistoriaReal,
          hospitalReal,
          entrada.categoriaId || '',
          entrada.form || {},
          entrada.subitemInfo || {},
          ehIdLocal(entrada.itemId) ? undefined : entrada.itemId,
          arquivos.length > 0 ? arquivos : undefined,
          entrada.fotosRemovidas,
          entrada.subitemId,
          entrada.fiscalId,
        )

        for (const fotoId of entrada.fotosIds || []) {
          await db.dbDelete('fotos', fotoId)
        }
      } else if (entrada.tipo === 'caracterizacao') {
        const vistoriaReal = ehIdLocal(entrada.vistoriaId)
          ? mapaVistorias.get(entrada.vistoriaId)
          : entrada.vistoriaId
        if (!vistoriaReal) {
          throw new Error('Vistoria correspondente ainda não foi criada no servidor.')
        }
        await vistoriasService.updateCaracterizacao(vistoriaReal, entrada.caracterizacao)
      }

      if (entrada.id !== undefined) {
        await db.dbDelete('outbox', entrada.id)
      }
      enviados++
    } catch (err) {
      falhas++
      mensagemErro = err instanceof Error ? err.message : String(err)
      console.error('Falha ao enviar pendência offline:', entrada, err)

      if (entrada.id !== undefined) {
        await db.dbPut('outbox', {
          ...entrada,
          tentativas: (entrada.tentativas || 0) + 1,
          ultimoErro: mensagemErro,
        })
      }
    }
  }

  return { enviados, falhas, mensagemErro }
}
