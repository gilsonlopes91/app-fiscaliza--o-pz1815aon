migrate(
  (app) => {
    // Padroniza a grafia do município nos cadastros já existentes, para que o
    // relatório não tenha duas formas de escrever a mesma cidade.
    const MUNICIPIOS = [
      'Acauã',
      'Agricolândia',
      'Água Branca',
      'Alagoinha do Piauí',
      'Alegrete do Piauí',
      'Alto Longá',
      'Altos',
      'Alvorada do Gurgueia',
      'Amarante',
      'Angical do Piauí',
      'Anísio de Abreu',
      'Antônio Almeida',
      'Aroazes',
      'Aroeiras do Itaim',
      'Arraial',
      'Assunção do Piauí',
      'Avelino Lopes',
      'Baixa Grande do Ribeiro',
      "Barra d'Alcântara",
      'Barras',
      'Barreiras do Piauí',
      'Barro Duro',
      'Batalha',
      'Bela Vista do Piauí',
      'Belém do Piauí',
      'Beneditinos',
      'Bertolínia',
      'Betânia do Piauí',
      'Boa Hora',
      'Bocaina',
      'Bom Jesus',
      'Bom Princípio do Piauí',
      'Bonfim do Piauí',
      'Boqueirão do Piauí',
      'Brasileira',
      'Brejo do Piauí',
      'Buriti dos Lopes',
      'Buriti dos Montes',
      'Cabeceiras do Piauí',
      'Cajazeiras do Piauí',
      'Cajueiro da Praia',
      'Caldeirão Grande do Piauí',
      'Campinas do Piauí',
      'Campo Alegre do Fidalgo',
      'Campo Grande do Piauí',
      'Campo Largo do Piauí',
      'Campo Maior',
      'Canavieira',
      'Canto do Buriti',
      'Capitão de Campos',
      'Capitão Gervásio Oliveira',
      'Caracol',
      'Caraúbas do Piauí',
      'Caridade do Piauí',
      'Castelo do Piauí',
      'Caxingó',
      'Cocal',
      'Cocal de Telha',
      'Cocal dos Alves',
      'Coivaras',
      'Colônia do Gurgueia',
      'Colônia do Piauí',
      'Conceição do Canindé',
      'Coronel José Dias',
      'Corrente',
      'Cristalândia do Piauí',
      'Cristino Castro',
      'Curimatá',
      'Currais',
      'Curral Novo do Piauí',
      'Curralinhos',
      'Demerval Lobão',
      'Dirceu Arcoverde',
      'Dom Expedito Lopes',
      'Dom Inocêncio',
      'Domingos Mourão',
      'Elesbão Veloso',
      'Eliseu Martins',
      'Esperantina',
      'Fartura do Piauí',
      'Flores do Piauí',
      'Floresta do Piauí',
      'Floriano',
      'Francinópolis',
      'Francisco Ayres',
      'Francisco Macedo',
      'Francisco Santos',
      'Fronteiras',
      'Geminiano',
      'Gilbués',
      'Guadalupe',
      'Guaribas',
      'Hugo Napoleão',
      'Ilha Grande',
      'Inhuma',
      'Ipiranga do Piauí',
      'Isaías Coelho',
      'Itainópolis',
      'Itaueira',
      'Jacobina do Piauí',
      'Jaicós',
      'Jardim do Mulato',
      'Jatobá do Piauí',
      'Jerumenha',
      'João Costa',
      'Joaquim Pires',
      'Joca Marques',
      'José de Freitas',
      'Juazeiro do Piauí',
      'Júlio Borges',
      'Jurema',
      'Lagoa Alegre',
      'Lagoa de São Francisco',
      'Lagoa do Barro do Piauí',
      'Lagoa do Piauí',
      'Lagoa do Sítio',
      'Lagoinha do Piauí',
      'Landri Sales',
      'Luís Correia',
      'Luzilândia',
      'Madeiro',
      'Manoel Emídio',
      'Marcolândia',
      'Marcos Parente',
      'Massapê do Piauí',
      'Matias Olímpio',
      'Miguel Alves',
      'Miguel Leão',
      'Milton Brandão',
      'Monsenhor Gil',
      'Monsenhor Hipólito',
      'Monte Alegre do Piauí',
      'Morro Cabeça no Tempo',
      'Morro do Chapéu do Piauí',
      'Murici dos Portelas',
      'Nazaré do Piauí',
      'Nazária',
      'Nossa Senhora de Nazaré',
      'Nossa Senhora dos Remédios',
      'Nova Santa Rita',
      'Novo Oriente do Piauí',
      'Novo Santo Antônio',
      'Oeiras',
      "Olho d'Água do Piauí",
      'Padre Marcos',
      'Paes Landim',
      'Pajeú do Piauí',
      'Palmeira do Piauí',
      'Palmeirais',
      'Paquetá',
      'Parnaguá',
      'Parnaíba',
      'Passagem Franca do Piauí',
      'Patos do Piauí',
      "Pau D'Arco do Piauí",
      'Paulistana',
      'Pavussu',
      'Pedro II',
      'Pedro Laurentino',
      'Picos',
      'Pimenteiras',
      'Pio IX',
      'Piracuruca',
      'Piripiri',
      'Porto',
      'Porto Alegre do Piauí',
      'Prata do Piauí',
      'Queimada Nova',
      'Redenção do Gurgueia',
      'Regeneração',
      'Riacho Frio',
      'Ribeira do Piauí',
      'Ribeiro Gonçalves',
      'Rio Grande do Piauí',
      'Santa Cruz do Piauí',
      'Santa Cruz dos Milagres',
      'Santa Filomena',
      'Santa Luz',
      'Santa Rosa do Piauí',
      'Santana do Piauí',
      'Santo Antônio de Lisboa',
      'Santo Antônio dos Milagres',
      'Santo Inácio do Piauí',
      'São Braz do Piauí',
      'São Félix do Piauí',
      'São Francisco de Assis do Piauí',
      'São Francisco do Piauí',
      'São Gonçalo do Gurgueia',
      'São Gonçalo do Piauí',
      'São João da Canabrava',
      'São João da Fronteira',
      'São João da Serra',
      'São João da Varjota',
      'São João do Arraial',
      'São João do Piauí',
      'São José do Divino',
      'São José do Peixe',
      'São José do Piauí',
      'São Julião',
      'São Lourenço do Piauí',
      'São Luis do Piauí',
      'São Miguel da Baixa Grande',
      'São Miguel do Fidalgo',
      'São Miguel do Tapuio',
      'São Pedro do Piauí',
      'São Raimundo Nonato',
      'Sebastião Barros',
      'Sebastião Leal',
      'Sigefredo Pacheco',
      'Simões',
      'Simplício Mendes',
      'Socorro do Piauí',
      'Sussuapara',
      'Tamboril do Piauí',
      'Tanque do Piauí',
      'Teresina',
      'União',
      'Uruçuí',
      'Valença do Piauí',
      'Várzea Branca',
      'Várzea Grande',
      'Vera Mendes',
      'Vila Nova do Piauí',
      'Wall Ferraz',
    ]

    const ACENTOS = {
      á: 'a',
      à: 'a',
      â: 'a',
      ã: 'a',
      ä: 'a',
      é: 'e',
      è: 'e',
      ê: 'e',
      ë: 'e',
      í: 'i',
      ì: 'i',
      î: 'i',
      ï: 'i',
      ó: 'o',
      ò: 'o',
      ô: 'o',
      õ: 'o',
      ö: 'o',
      ú: 'u',
      ù: 'u',
      û: 'u',
      ü: 'u',
      ç: 'c',
      ñ: 'n',
    }

    function normalizar(valor) {
      const base = String(valor || '').toLowerCase()
      let saida = ''
      const partes = base.split('')
      for (let i = 0; i < partes.length; i++) {
        saida += ACENTOS[partes[i]] || partes[i]
      }
      saida = saida
        .replace(/[’`´]/g, "'")
        .replace(/\./g, '')
        .replace(/\s+/g, ' ')
        .trim()
      // Remove sufixo de UF: "- pi", "/pi", ", piaui"
      saida = saida.replace(/[\s,/-]+(pi|piaui)$/, '').trim()
      return saida
    }

    const indice = {}
    for (let i = 0; i < MUNICIPIOS.length; i++) {
      indice[normalizar(MUNICIPIOS[i])] = MUNICIPIOS[i]
    }

    let corrigidos = 0
    const naoReconhecidos = []

    try {
      const registros = app.findAllRecords('hospitais')
      for (let i = 0; i < registros.length; i++) {
        const registro = registros[i]
        const atual = registro.get('municipio')
        if (!atual) continue

        const oficial = indice[normalizar(atual)]
        if (!oficial) {
          naoReconhecidos.push(atual)
          continue
        }
        if (oficial !== atual) {
          registro.set('municipio', oficial)
          app.save(registro)
          corrigidos++
        }
      }
    } catch (err) {
      console.log('Falha ao normalizar municípios: ' + err)
    }

    console.log('Municípios padronizados: ' + corrigidos)
    if (naoReconhecidos.length > 0) {
      console.log('Municípios fora da lista do Piauí: ' + naoReconhecidos.join(' | '))
    }
  },
  (app) => {
    // Normalização de texto não é revertida.
  },
)
