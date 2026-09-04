import JSZip from 'jszip'
import { getVistoriaItemPhotoUrl, VistoriaItem } from '@/services/vistorias'
import { Hospital } from '@/services/hospitais'
import { SubitemChecklist, CategoriaVistoria } from '@/services/categoriasVistoria'

/**
 * Normaliza strings para uso seguro em nomes de arquivo
 */
export function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
}

/**
 * Faz download de uma foto individual pelo browser
 */
export async function downloadSinglePhoto(url: string, preferredFileName: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Erro ao baixar foto (${response.status})`)
  }
  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = blobUrl
  a.download = preferredFileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}

export interface PhotoZipItem {
  url: string
  subitemCode: string
  subitemDesc: string
  categoryName: string
  photoIndex: number
  photoFileName: string
}

/**
 * Coleta todas as fotos anexadas nos itens de uma vistoria e gera um arquivo ZIP.
 * As fotos mantêm a marca d'água permanente que já foi gravada na imagem.
 */
export async function downloadAllVistoriaPhotosZip(params: {
  vistoriaId: string
  hospital?: Hospital | null
  vistoriaItens: VistoriaItem[]
  categorias: CategoriaVistoria[]
  subitens: SubitemChecklist[]
  onProgress?: (current: number, total: number) => void
}): Promise<{ count: number; zipName: string }> {
  const { hospital, vistoriaItens, categorias, subitens, onProgress } = params

  // 1. Mapear todas as fotos existentes
  const photoList: PhotoZipItem[] = []

  for (const item of vistoriaItens) {
    if (!item.fotos || item.fotos.length === 0) continue

    const cat = categorias.find((c) => c.id === item.categoria)
    const sub = subitens.find((s) => s.id === item.subitem)

    const subitemCode = sub?.codigo || (cat?.ordem ? `${cat.ordem}.1` : 'item')
    const subitemDesc = sub?.descricao || cat?.nome || 'vistoria'
    const categoryName = cat?.nome || 'item'

    item.fotos.forEach((photoFileName, idx) => {
      const url = getVistoriaItemPhotoUrl(
        { id: item.id, collectionName: 'vistoria_itens' },
        photoFileName,
      )
      photoList.push({
        url,
        subitemCode,
        subitemDesc,
        categoryName,
        photoIndex: idx + 1,
        photoFileName,
      })
    })
  }

  if (photoList.length === 0) {
    return { count: 0, zipName: '' }
  }

  // 2. Montar arquivo ZIP
  const zip = new JSZip()
  const hospitalSlug = sanitizeFileName(hospital?.nome || 'vistoria')
  const dateStr = new Date().toISOString().split('T')[0]
  const zipFileName = `fotos-vistoria-${hospitalSlug}-${dateStr}.zip`

  // Pasta raiz das fotos dentro do zip
  const photosFolder = zip.folder(`fotos_${hospitalSlug}`) || zip

  let completed = 0
  const total = photoList.length

  for (const photo of photoList) {
    try {
      const response = await fetch(photo.url)
      if (!response.ok) {
        console.warn(`Foto não acessível para ZIP: ${photo.url}`)
        continue
      }
      const blob = await response.blob()

      // Extensão da foto (.jpg, .png, etc.)
      const extension = photo.photoFileName.includes('.')
        ? `.${photo.photoFileName.split('.').pop()}`
        : '.jpg'

      // Nome amigável: subitem_1_1-foto-1.jpg
      const cleanSubCode = sanitizeFileName(photo.subitemCode)
      const cleanSubDesc = sanitizeFileName(photo.subitemDesc).slice(0, 30)
      const fileName = `${cleanSubCode}_${cleanSubDesc}_foto-${photo.photoIndex}${extension}`

      photosFolder.file(fileName, blob)
    } catch (err) {
      console.error(`Erro ao incluir foto ${photo.photoFileName} no ZIP:`, err)
    } finally {
      completed++
      if (onProgress) {
        onProgress(completed, total)
      }
    }
  }

  // Adicionar um README / Manifesto dentro do ZIP
  const manifestContent = [
    `CREA-PI • Vistoria Técnica de Fiscalização`,
    `Empreendimento: ${hospital?.nome || 'N/A'}`,
    `Município: ${hospital?.municipio || 'N/A'}`,
    `CNES: ${hospital?.cnes || 'N/A'}`,
    `Data do Download: ${new Date().toLocaleString('pt-BR')}`,
    `Total de fotos no pacote: ${total}`,
    `----------------------------------------------------`,
    ...photoList.map(
      (p) =>
        `- Subitem ${p.subitemCode} (${p.categoryName}): ${p.subitemDesc} (Foto ${p.photoIndex})`,
    ),
  ].join('\n')

  zip.file('manifesto_vistoria.txt', manifestContent)

  // 3. Gerar e disparar download
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  const blobUrl = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = zipFileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)

  return { count: total, zipName: zipFileName }
}
