/**
 * Utilitários de geolocalização para o cadastro de empreendimentos.
 *
 * O fiscal normalmente tem em mãos apenas as coordenadas (fazendas, barragens,
 * torres, obras rurais etc.), copiadas do Google Maps, do WhatsApp ou do GPS.
 * Aqui aceitamos os formatos mais comuns e convertemos para grau decimal.
 */

export interface Coordenadas {
  lat: number
  lng: number
}

/** Valida faixa geográfica e descarta o par 0,0 (normalmente lixo de formulário). */
function isValid(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  )
}

function buildPair(a: string, b: string): Coordenadas | null {
  const lat = Number(String(a).replace(',', '.'))
  const lng = Number(String(b).replace(',', '.'))
  return isValid(lat, lng) ? { lat, lng } : null
}

/** Converte graus/minutos/segundos (ex.: 5°05'21.0"S 42°48'05.2"W) para decimal. */
function parseDMS(input: string): Coordenadas | null {
  const regex =
    /(\d{1,3})\s*[°º]\s*(?:(\d{1,2}(?:[.,]\d+)?)\s*['′’]?\s*)?(?:(\d{1,2}(?:[.,]\d+)?)\s*["″”]?\s*)?([NSLOWEnsloew])/g

  const found: { value: number; dir: string }[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(input)) !== null) {
    const graus = Number(match[1])
    const minutos = match[2] ? Number(match[2].replace(',', '.')) : 0
    const segundos = match[3] ? Number(match[3].replace(',', '.')) : 0
    const dir = match[4].toUpperCase()

    let value = graus + minutos / 60 + segundos / 3600
    // S = sul, O = oeste, W = west → negativos
    if (dir === 'S' || dir === 'O' || dir === 'W') value = -value

    found.push({ value, dir })
    if (found.length === 2) break
  }

  if (found.length !== 2) return null

  const latItem = found.find((f) => f.dir === 'N' || f.dir === 'S')
  const lngItem = found.find(
    (f) => f.dir === 'L' || f.dir === 'O' || f.dir === 'W' || f.dir === 'E',
  )

  if (!latItem || !lngItem) return null
  return isValid(latItem.value, lngItem.value) ? { lat: latItem.value, lng: lngItem.value } : null
}

/** Extrai coordenadas de um link do Google Maps colado pelo usuário. */
function parseUrl(input: string): Coordenadas | null {
  let url = input
  try {
    url = decodeURIComponent(input)
  } catch {
    // mantém o texto original se o decode falhar
  }

  const padroes: RegExp[] = [
    // .../data=...!3d-5.089123!4d-42.801456 (ponto exato do local)
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    // .../@-5.089123,-42.801456,17z (centro do mapa)
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    // ?q=-5.089123,-42.801456 / &query= / &ll= / &destination=
    /[?&](?:q|ll|query|center|daddr|destination|sll|mrt)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
    // .../place/-5.089123,-42.801456
    /\/(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/,
  ]

  for (const padrao of padroes) {
    const m = url.match(padrao)
    if (m) {
      const par = buildPair(m[1], m[2])
      if (par) return par
    }
  }

  return null
}

/** Pares decimais simples: "-5.089123, -42.801456" ou "-5,089123 -42,801456". */
function parseDecimal(input: string): Coordenadas | null {
  const limpo = input
    .replace(/[()[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Vírgula como separador decimal e espaço/ponto-e-vírgula separando o par
  const comVirgulaDecimal = limpo.match(/^(-?\d{1,3},\d+)\s*[;\s]\s*(-?\d{1,3},\d+)$/)
  if (comVirgulaDecimal) return buildPair(comVirgulaDecimal[1], comVirgulaDecimal[2])

  // Ponto como separador decimal (padrão do Google Maps)
  const padrao = limpo.match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/)
  if (padrao) return buildPair(padrao[1], padrao[2])

  return null
}

/**
 * Aceita coordenadas decimais, DMS ou um link do Google Maps colado.
 * Retorna null quando não consegue identificar um par válido.
 */
export function parseCoordenadas(input?: string | null): Coordenadas | null {
  if (!input) return null
  const texto = String(input).trim()
  if (!texto) return null

  if (/https?:\/\//i.test(texto)) {
    return parseUrl(texto)
  }

  return parseDMS(texto) || parseDecimal(texto)
}

/**
 * Links encurtados (maps.app.goo.gl / goo.gl/maps) não carregam as coordenadas
 * no próprio endereço — é preciso abrir o link e copiar o link completo.
 */
export function isLinkEncurtado(input?: string | null): boolean {
  if (!input) return false
  return /(maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(input)
}

/** Texto padronizado para gravar/exibir: "-5.089123, -42.801456". */
export function formatCoordenadas(lat: number, lng: number, casas = 6): string {
  return `${lat.toFixed(casas)}, ${lng.toFixed(casas)}`
}

/** Monta a coordenada a partir dos campos gravados no registro. */
export function coordenadasDoRegistro(
  latitude?: string | number | null,
  longitude?: string | number | null,
): Coordenadas | null {
  if (latitude === null || latitude === undefined || latitude === '') return null
  if (longitude === null || longitude === undefined || longitude === '') return null
  return buildPair(String(latitude), String(longitude))
}

/**
 * Link do Google Maps, na forma de CAMINHO (/maps/place/lat,lng) em vez de
 * query string.
 *
 * Motivo: o proxy da rede do CREA-PI bloqueia URLs de google.com que contenham
 * parâmetros de busca ("?q=" ou "/search/?query="), devolvendo
 * ERR_BLOCKED_BY_RESPONSE — é o filtro que força SafeSearch. Já as URLs em
 * formato de caminho (/maps/place/... e /maps/dir/...) passam normalmente.
 * Essa forma também abre direto no app do Google Maps no Android e no iOS.
 */
export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/place/${lat},${lng}/@${lat},${lng},16z`
}

/**
 * Rota até o ponto. A origem vazia (dir//destino) faz o Google usar
 * "Seu local" automaticamente.
 */
export function googleMapsRotaUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir//${lat},${lng}`
}

/** Alternativa quando o Google está bloqueado na rede: OpenStreetMap. */
export function openStreetMapUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
}

/** Copia texto para a área de transferência, com fallback para navegadores antigos. */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto)
      return true
    }
  } catch {
    // segue para o fallback
  }

  try {
    const area = document.createElement('textarea')
    area.value = texto
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}
