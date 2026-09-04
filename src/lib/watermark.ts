/**
 * Utilitários para captura de geolocalização, timestamp e marca d'água permanente em fotos de vistoria.
 * Padrão CREA-PI (azul #004B8D, fundo semi-transparente para legibilidade).
 */

export interface PhotoCaptureMetadata {
  latitude: number | null
  longitude: number | null
  dataCaptura: string // ISO string
  formattedLocation: string
  formattedDateTime: string
}

/**
 * Obtém a geolocalização atual do dispositivo via navigator.geolocation.
 * Retorna coordenadas se permitido, ou null se recusado/indisponível com fallback seguro.
 */
export async function getCurrentCoordinates(): Promise<{
  latitude: number | null
  longitude: number | null
}> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return { latitude: null, longitude: null }
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => {
        console.warn('Geolocalização não obtida:', error.message)
        resolve({ latitude: null, longitude: null })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    )
  })
}

/**
 * Formata data e hora no padrão brasileiro (DD/MM/AAAA HH:mm:ss)
 */
export function formatCaptureDateTime(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const year = date.getFullYear()
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

/**
 * Aplica a marca d'água permanente na imagem via HTML5 Canvas.
 * Queima na própria imagem:
 * - Tarja inferior ou badge no canto inferior com fundo escuro semi-transparente
 * - Logo/Texto CREA-PI
 * - Coordenadas (Lat, Long ou 'Localização indisponível')
 * - Data e Hora exata da captura
 *
 * Retorna um novo objeto File contendo a imagem modificada e os metadados.
 */
export async function applyWatermarkToImage(
  file: File,
  coords?: { latitude: number | null; longitude: number | null },
  captureDate: Date = new Date(),
): Promise<{ processedFile: File; metadata: PhotoCaptureMetadata }> {
  const geo = coords !== undefined ? coords : await getCurrentCoordinates()
  const formattedDateTime = formatCaptureDateTime(captureDate)
  const formattedLocation =
    geo.latitude !== null && geo.longitude !== null
      ? `Lat: ${geo.latitude.toFixed(6)}, Long: ${geo.longitude.toFixed(6)}`
      : 'Localização indisponível'

  const metadata: PhotoCaptureMetadata = {
    latitude: geo.latitude,
    longitude: geo.longitude,
    dataCaptura: captureDate.toISOString(),
    formattedLocation,
    formattedDateTime,
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Erro ao ler arquivo da foto'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Erro ao carregar dados da imagem'))
      img.onload = () => {
        try {
          // Dimensões originais (ou limitadas a max 2400px para não estourar memória do browser)
          const MAX_DIM = 2400
          let width = img.width
          let height = img.height

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width)
              width = MAX_DIM
            } else {
              width = Math.round((width * MAX_DIM) / height)
              height = MAX_DIM
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            // Fallback: se não der pra criar context 2D, retorna o arquivo original
            resolve({ processedFile: file, metadata })
            return
          }

          // Desenha a imagem base
          ctx.drawImage(img, 0, 0, width, height)

          // Proporção de tamanho para fontes e paddings baseado no tamanho da imagem
          const baseScale = Math.max(width, height) / 1000
          const fontSizeTitle = Math.max(14, Math.round(15 * baseScale))
          const fontSizeDetails = Math.max(12, Math.round(13 * baseScale))
          const padding = Math.max(12, Math.round(14 * baseScale))
          const barHeight = Math.max(50, Math.round(60 * baseScale))

          // Tarja no canto inferior direito ou em toda a base
          // Vamos desenhar uma caixa retangular estilizada no canto inferior direito
          const boxWidth = Math.min(width - padding * 2, Math.max(320 * baseScale, 360))
          const boxHeight = barHeight
          const boxX = width - boxWidth - padding
          const boxY = height - boxHeight - padding

          // Desenha fundo escuro com transparência (azul escuro elegante CREA-PI #002244)
          ctx.save()
          ctx.fillStyle = 'rgba(0, 34, 68, 0.85)'
          // Cantos arredondados na caixa de água
          const radius = Math.max(6, Math.round(8 * baseScale))
          ctx.beginPath()
          ctx.moveTo(boxX + radius, boxY)
          ctx.lineTo(boxX + boxWidth - radius, boxY)
          ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius)
          ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius)
          ctx.quadraticCurveTo(
            boxX + boxWidth,
            boxY + boxHeight,
            boxX + boxWidth - radius,
            boxY + boxHeight,
          )
          ctx.lineTo(boxX + radius, boxY + boxHeight)
          ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius)
          ctx.lineTo(boxX, boxY + radius)
          ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY)
          ctx.closePath()
          ctx.fill()

          // Borda sutil azul claro CREA
          ctx.strokeStyle = '#004B8D'
          ctx.lineWidth = Math.max(1.5, 2 * baseScale)
          ctx.stroke()

          // Detalhe indicador (faixa lateral esquerda do badge)
          ctx.fillStyle = '#004B8D'
          ctx.fillRect(boxX, boxY + radius, Math.max(4, 5 * baseScale), boxHeight - radius * 2)

          // Textos da marca d'água
          const textX = boxX + padding + Math.max(4, 5 * baseScale)
          let currentY = boxY + padding + fontSizeTitle * 0.75

          // Linha 1: CREA-PI • Vistoria Técnica
          ctx.font = `bold ${fontSizeTitle}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
          ctx.fillStyle = '#FFFFFF'
          ctx.fillText('CREA-PI • FISCALIZAÇÃO', textX, currentY)

          // Data e hora à direita da linha 1
          ctx.font = `normal ${fontSizeDetails}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
          ctx.fillStyle = '#E8F1F8'
          const dateText = formattedDateTime
          const dateTextWidth = ctx.measureText(dateText).width
          const dateX = boxX + boxWidth - padding - dateTextWidth
          if (dateX > textX + ctx.measureText('CREA-PI • FISCALIZAÇÃO').width + 10) {
            ctx.fillText(dateText, dateX, currentY)
          }

          // Linha 2: Coordenadas GPS (ou 'Localização indisponível') + Data caso não coube acima
          currentY += fontSizeDetails * 1.35
          ctx.font = `500 ${fontSizeDetails}px "Courier New", Courier, monospace`
          ctx.fillStyle = geo.latitude !== null ? '#4CD964' : '#FFCC00' // Verde para GPS ativo, âmbar se indisponível
          ctx.fillText(`📍 ${formattedLocation}`, textX, currentY)

          ctx.restore()

          // Converte canvas para Blob / File
          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
          const quality = mimeType === 'image/jpeg' ? 0.9 : undefined

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve({ processedFile: file, metadata })
                return
              }
              const extension = mimeType === 'image/png' ? '.png' : '.jpg'
              const baseName = file.name.replace(/\.[^/.]+$/, '')
              const newFileName = `${baseName}-watermarked${extension}`
              const processed = new File([blob], newFileName, {
                type: mimeType,
                lastModified: captureDate.getTime(),
              })
              resolve({ processedFile: processed, metadata })
            },
            mimeType,
            quality,
          )
        } catch (canvasErr) {
          console.error('Falha ao processar canvas da foto:', canvasErr)
          resolve({ processedFile: file, metadata })
        }
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
