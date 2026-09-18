/**
 * Caracterização do empreendimento rural — o que existe na fazenda.
 *
 * Reproduz as marcações do "Relatório de Visita ao Produtor Rural" do CREA-PI
 * (culturas e criação animal do Anexo I) e acrescenta as estruturas físicas,
 * que são o que realmente define quais temas do Anexo II devem ser fiscalizados.
 *
 * O dado é gravado na vistoria — cada visita/safra tem a sua.
 */

export interface OpcaoCaracterizacao {
  id: string
  nome: string
}

/** As 14 culturas listadas no formulário do CREA-PI. */
export const CULTURAS: OpcaoCaracterizacao[] = [
  { id: 'soja', nome: 'Soja' },
  { id: 'milho', nome: 'Milho' },
  { id: 'feijao', nome: 'Feijão' },
  { id: 'algodao', nome: 'Algodão' },
  { id: 'arroz', nome: 'Arroz' },
  { id: 'tabaco', nome: 'Tabaco' },
  { id: 'citros', nome: 'Citros' },
  { id: 'fenacao', nome: 'Fenação' },
  { id: 'sorgo', nome: 'Sorgo' },
  { id: 'milheto', nome: 'Milheto' },
  { id: 'fruticolas', nome: 'Frutícolas' },
  { id: 'olericolas', nome: 'Olerícolas' },
  { id: 'trigo', nome: 'Trigo' },
]

/** As 9 criações listadas no formulário do CREA-PI. */
export const CRIACOES: OpcaoCaracterizacao[] = [
  { id: 'avicultura', nome: 'Avicultura' },
  { id: 'piscicultura', nome: 'Piscicultura' },
  { id: 'suinocultura', nome: 'Suinocultura' },
  { id: 'ovinocultura', nome: 'Ovinocultura' },
  { id: 'caprinocultura', nome: 'Caprinocultura (leite e corte)' },
  { id: 'bovinocultura', nome: 'Bovinocultura (leite e corte)' },
  { id: 'equideocultura', nome: 'Equideocultura' },
  { id: 'bubalinocultura', nome: 'Bubalinocultura' },
  { id: 'estrutiocultura', nome: 'Estrutiocultura' },
]

/** Estruturas e instalações que acionam os temas de manutenção predial. */
export const ESTRUTURAS: OpcaoCaracterizacao[] = [
  { id: 'silo_armazem', nome: 'Silo / armazém de grãos' },
  { id: 'secador_prelimpeza', nome: 'Secador / máquina de pré-limpeza' },
  { id: 'irrigacao', nome: 'Irrigação (pivô ou outro)' },
  { id: 'camara_fria', nome: 'Câmara fria' },
  { id: 'ar_condicionado', nome: 'Ar-condicionado central ou split' },
  { id: 'caldeira_vaso', nome: 'Caldeira / vaso de pressão' },
  { id: 'esteira_transporte', nome: 'Esteira / equipamento de transporte' },
  { id: 'tanque_combustivel', nome: 'Tanque e bomba de combustível' },
  { id: 'balanca_rodoviaria', nome: 'Balança rodoviária' },
  { id: 'subestacao', nome: 'Subestação / rede de média tensão' },
  { id: 'grupo_gerador', nome: 'Grupo gerador' },
  { id: 'solar_fotovoltaico', nome: 'Solar fotovoltaico' },
  { id: 'cftv', nome: 'CFTV' },
  { id: 'instalacoes_criacao', nome: 'Aviário / pocilga / curral / estábulo' },
  { id: 'moradias', nome: 'Moradias rurais' },
  { id: 'floresta', nome: 'Floresta plantada / supressão de vegetação' },
]

export interface CaracterizacaoAgro {
  culturas: string[]
  criacoes: string[]
  estruturas: string[]
  outrasCulturas: string
  atualizadaEm?: string
}

export const CARACTERIZACAO_VAZIA: CaracterizacaoAgro = {
  culturas: [],
  criacoes: [],
  estruturas: [],
  outrasCulturas: '',
}

/** Lê o campo gravado na vistoria (objeto ou string JSON) com tolerância a lixo. */
export function parseCaracterizacao(valor: unknown): CaracterizacaoAgro {
  if (!valor) return { ...CARACTERIZACAO_VAZIA }

  let bruto: Record<string, unknown> | null = null
  if (typeof valor === 'string') {
    try {
      bruto = JSON.parse(valor)
    } catch {
      return { ...CARACTERIZACAO_VAZIA }
    }
  } else if (typeof valor === 'object') {
    bruto = valor as Record<string, unknown>
  }

  if (!bruto) return { ...CARACTERIZACAO_VAZIA }

  const lista = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []

  return {
    culturas: lista(bruto.culturas),
    criacoes: lista(bruto.criacoes),
    estruturas: lista(bruto.estruturas),
    outrasCulturas: typeof bruto.outrasCulturas === 'string' ? bruto.outrasCulturas : '',
    atualizadaEm: typeof bruto.atualizadaEm === 'string' ? bruto.atualizadaEm : undefined,
  }
}

/** True quando o fiscal já marcou alguma coisa. */
export function caracterizacaoPreenchida(c: CaracterizacaoAgro): boolean {
  return (
    c.culturas.length > 0 ||
    c.criacoes.length > 0 ||
    c.estruturas.length > 0 ||
    c.outrasCulturas.trim().length > 0
  )
}

const GRAOS = ['soja', 'milho', 'feijao', 'arroz', 'sorgo', 'milheto', 'trigo']

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export interface AvaliacaoTema {
  /** O tema deve ser fiscalizado neste empreendimento. */
  aplica: boolean
  /** Tema que nunca é dispensado automaticamente (a ausência é a própria irregularidade). */
  blindado: boolean
  /** Explicação curta do porquê, para mostrar ao fiscal. */
  motivo: string
}

/**
 * Decide se um tema do checklist se aplica, a partir do que foi marcado.
 *
 * Quatro grupos nunca são dispensados automaticamente — Segurança e Saúde no
 * Trabalho, Meio Ambiente e Resíduos, Prevenção e Combate a Incêndio e
 * Georreferenciamento/Crédito Rural — porque valem para qualquer imóvel rural
 * e a ausência deles é justamente o que a fiscalização precisa flagrar.
 */
export function avaliarTema(nomeTema: string, c: CaracterizacaoAgro): AvaliacaoTema {
  const nome = normalizar(nomeTema)

  const temCultura = c.culturas.length > 0 || c.outrasCulturas.trim().length > 0
  const temCriacao = c.criacoes.length > 0
  const tem = (id: string) => c.estruturas.includes(id)
  const temGraos = c.culturas.some((x) => GRAOS.includes(x))
  const temArmazenagem = tem('silo_armazem') || tem('secador_prelimpeza')

  const blindado = (motivo: string): AvaliacaoTema => ({ aplica: true, blindado: true, motivo })
  const decidir = (condicao: boolean, motivo: string): AvaliacaoTema => ({
    aplica: condicao,
    blindado: false,
    motivo,
  })

  // Temas que valem para qualquer imóvel rural
  if (/saude no trabalho|sst/.test(nome)) {
    return blindado('Vale para qualquer empreendimento com empregados.')
  }
  if (/meio ambiente|residuo/.test(nome)) {
    return blindado('Vale para qualquer imóvel rural.')
  }
  if (/incendio/.test(nome)) {
    return blindado('Vale para qualquer empreendimento com edificação.')
  }
  if (/georreferenciamento|credito rural/.test(nome)) {
    return blindado('Todo imóvel rural precisa de georreferenciamento.')
  }
  if (/infraestrutura rural/.test(nome)) {
    return blindado('Toda propriedade tem estradas e construções internas.')
  }
  if (/instalacoes eletricas|geracao de energia/.test(nome)) {
    return blindado('Toda propriedade tem instalação elétrica.')
  }

  // Temas condicionados ao que existe no empreendimento
  if (/producao vegetal|assistencia tecnica/.test(nome)) {
    return decidir(temCultura, 'Depende de haver cultura declarada.')
  }
  if (/producao animal/.test(nome)) {
    return decidir(temCriacao, 'Depende de haver criação animal declarada.')
  }
  if (/agrotoxico|fertilizante/.test(nome)) {
    return decidir(temCultura, 'Depende de haver cultura declarada.')
  }
  if (/armazenagem|pos-colheita|pos colheita/.test(nome)) {
    return decidir(temGraos || temArmazenagem, 'Depende de grãos ou estrutura de armazenagem.')
  }
  if (/irrigacao/.test(nome)) {
    return decidir(tem('irrigacao'), 'Depende de sistema de irrigação declarado.')
  }
  if (/exploracao florestal/.test(nome)) {
    return decidir(tem('floresta'), 'Depende de floresta plantada ou supressão declarada.')
  }
  if (/solo, mecanizacao|mecanizacao|agrometeorologia/.test(nome)) {
    return decidir(temCultura, 'Depende de haver cultura declarada.')
  }
  if (/edificacoes e estruturas de armazenagem/.test(nome)) {
    return decidir(temArmazenagem, 'Depende de silo, secador ou armazém declarado.')
  }
  if (/climatizacao|refrigeracao/.test(nome)) {
    return decidir(
      tem('camara_fria') || tem('ar_condicionado'),
      'Depende de câmara fria ou ar-condicionado declarado.',
    )
  }
  if (/instalacoes mecanicas/.test(nome)) {
    return decidir(
      tem('caldeira_vaso') ||
        tem('esteira_transporte') ||
        tem('tanque_combustivel') ||
        tem('balanca_rodoviaria'),
      'Depende de caldeira, esteira, tanque de combustível ou balança.',
    )
  }
  if (/seguranca eletronica|controle de pragas/.test(nome)) {
    return decidir(
      tem('cftv') || temArmazenagem,
      'Depende de CFTV ou de estrutura de armazenagem (expurgo).',
    )
  }

  // Tema desconhecido (criado manualmente pelo admin): nunca dispensa sozinho
  return blindado('Tema fora do mapeamento automático.')
}

/** Nome legível de um id de opção. */
export function nomeOpcao(id: string): string {
  const todas = [...CULTURAS, ...CRIACOES, ...ESTRUTURAS]
  return todas.find((o) => o.id === id)?.nome || id
}

/** Resumo em texto para o relatório em PDF. */
export function resumoCaracterizacao(c: CaracterizacaoAgro): string {
  const partes: string[] = []

  const culturas = c.culturas.map(nomeOpcao)
  if (c.outrasCulturas.trim()) culturas.push(c.outrasCulturas.trim())
  if (culturas.length > 0) partes.push(`Culturas: ${culturas.join(', ')}`)

  if (c.criacoes.length > 0) partes.push(`Criação: ${c.criacoes.map(nomeOpcao).join(', ')}`)
  if (c.estruturas.length > 0) partes.push(`Estruturas: ${c.estruturas.map(nomeOpcao).join(', ')}`)

  return partes.join('  |  ')
}
