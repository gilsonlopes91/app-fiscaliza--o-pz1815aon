/**
 * Regras de terminologia por tipo de empreendimento.
 *
 * O app nasceu para hospitais, mas o catálogo passou a incluir fazendas,
 * barragens, obras, indústrias etc. Estes helpers evitam que a interface
 * continue chamando tudo de "hospital" e que campos exclusivos da saúde
 * (como o CNES) sejam exigidos de quem não tem.
 */

const TIPOS_SAUDE =
  /(hospital|cl[íi]nic|laborat[óo]ri|sa[úu]de|upa\b|policl[íi]nic|pronto[- ]?atendimento|pronto[- ]?socorro|ambulat[óo]ri|hemo(centro|n[úu]cleo)|diagn[óo]stic|imagem|odontol[óo]g|posto de sa)/i

const TIPOS_RURAIS =
  /(fazenda|agroneg|agropecu|agr[íi]col|agro\b|rural|pecu[áa]ri|s[íi]tio|ch[áa]cara|granja|lavoura|florest|silvicult|irriga)/i

/** True quando o tipo é um estabelecimento de saúde (aí sim o CNES faz sentido). */
export function isTipoSaude(tipo?: string | null): boolean {
  if (!tipo) return false
  return TIPOS_SAUDE.test(tipo.trim())
}

/**
 * True para empreendimentos rurais/agro. Libera os campos que só existem no
 * relatório de visita ao produtor rural (Inscrição Estadual, CPF do produtor
 * e Ano/Safra), mantendo a ficha do hospital enxuta.
 */
export function isTipoRural(tipo?: string | null): boolean {
  if (!tipo) return false
  return TIPOS_RURAIS.test(tipo.trim())
}

/** Nome do tipo para uso em títulos e textos, com fallback neutro. */
export function tipoLabel(tipo?: string | null): string {
  const limpo = (tipo || '').trim()
  return limpo || 'Empreendimento'
}

/** Exemplo de nome usado como placeholder, de acordo com o tipo. */
export function exemploNomePorTipo(tipo?: string | null): string {
  const t = (tipo || '').toLowerCase()
  if (isTipoSaude(tipo)) return 'Ex: Hospital Regional Dr. Francisco Ayres'
  if (t.includes('fazenda') || t.includes('agro') || t.includes('rural'))
    return 'Ex: Fazenda Santa Luzia'
  if (t.includes('barragem') || t.includes('açude') || t.includes('acude'))
    return 'Ex: Barragem de Salinas'
  if (t.includes('obra') || t.includes('constru')) return 'Ex: Obra do Viaduto da Av. Frei Serafim'
  if (t.includes('industr')) return 'Ex: Indústria Cerâmica Pedra Nova'
  return 'Ex: nome oficial do empreendimento'
}
