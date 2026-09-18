/**
 * Banco local do app (IndexedDB) para uso em campo sem internet.
 *
 * Guarda uma cópia das unidades, do checklist e das vistorias do fiscal, além
 * da fila de respostas e fotos ainda não enviadas ao servidor.
 */

const DB_NAME = 'fiscalizacao-creapi'
const DB_VERSION = 1

export type NomeStore =
  | 'meta'
  | 'hospitais'
  | 'categorias'
  | 'subitens'
  | 'vistorias'
  | 'vistoria_itens'
  | 'outbox'
  | 'fotos'

let dbPromise: Promise<IDBDatabase> | null = null

function abrirDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível neste navegador'))
      return
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'chave' })
      }
      for (const nome of [
        'hospitais',
        'categorias',
        'subitens',
        'vistorias',
        'vistoria_itens',
      ] as const) {
        if (!db.objectStoreNames.contains(nome)) {
          db.createObjectStore(nome, { keyPath: 'id' })
        }
      }
      if (!db.objectStoreNames.contains('outbox')) {
        db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('fotos')) {
        db.createObjectStore('fotos', { keyPath: 'id', autoIncrement: true })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  return dbPromise
}

async function comStore<T>(
  store: NomeStore,
  modo: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await abrirDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, modo)
    const req = fn(tx.objectStore(store))
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
  })
}

export async function dbPut<T>(store: NomeStore, valor: T): Promise<IDBValidKey> {
  return comStore<IDBValidKey>(store, 'readwrite', (s) => s.put(valor as unknown as object))
}

export async function dbPutMany<T>(store: NomeStore, valores: T[]): Promise<void> {
  if (valores.length === 0) return
  const db = await abrirDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const os = tx.objectStore(store)
    valores.forEach((v) => os.put(v as unknown as object))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function dbGetAll<T>(store: NomeStore): Promise<T[]> {
  return comStore<T[]>(store, 'readonly', (s) => s.getAll())
}

export async function dbGet<T>(store: NomeStore, chave: IDBValidKey): Promise<T | undefined> {
  return comStore<T | undefined>(store, 'readonly', (s) => s.get(chave))
}

export async function dbDelete(store: NomeStore, chave: IDBValidKey): Promise<void> {
  await comStore<undefined>(store, 'readwrite', (s) => s.delete(chave))
}

export async function dbClear(store: NomeStore): Promise<void> {
  await comStore<undefined>(store, 'readwrite', (s) => s.clear())
}

export async function dbCount(store: NomeStore): Promise<number> {
  try {
    return await comStore<number>(store, 'readonly', (s) => s.count())
  } catch {
    return 0
  }
}

/** Guarda um valor simples (data do último sync, id do fiscal etc.). */
export async function metaSet(chave: string, valor: unknown): Promise<void> {
  await dbPut('meta', { chave, valor })
}

export async function metaGet<T>(chave: string): Promise<T | null> {
  const registro = await dbGet<{ chave: string; valor: T }>('meta', chave)
  return registro ? registro.valor : null
}

/**
 * Pede ao navegador para não descartar os dados quando o aparelho ficar sem
 * espaço. Importante porque a fila pode conter fotos que ainda são prova.
 */
export async function solicitarArmazenamentoPersistente(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const jaPersistente = await navigator.storage.persisted()
      if (jaPersistente) return true
      return await navigator.storage.persist()
    }
  } catch {
    // navegador sem suporte
  }
  return false
}

/** Espaço usado e disponível, em bytes, quando o navegador informa. */
export async function espacoArmazenamento(): Promise<{ usado: number; total: number } | null> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate()
      return { usado: est.usage || 0, total: est.quota || 0 }
    }
  } catch {
    // sem suporte
  }
  return null
}

export function formatarBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
