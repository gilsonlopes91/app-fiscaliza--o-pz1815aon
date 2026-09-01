migrate(
  (app) => {
    let tiposCollection
    try {
      tiposCollection = app.findCollectionByNameOrId('tipos_empreendimento')
    } catch (_) {
      return
    }

    // New common engineering & agronomy enterprise types for CREA-PI
    const additionalTipos = [
      {
        nome: 'Fazenda / Agronegócio',
        icone: 'Tractor',
        descricao:
          'Propriedades rurais, lavouras de grãos, pivôs de irrigação, silos e armazenamento agrícola',
      },
      {
        nome: 'Indústria e Mineração',
        icone: 'Factory',
        descricao:
          'Plantas industriais, fábricas de processamento químico, cerâmicas e extração mineral',
      },
      {
        nome: 'Energias Renováveis (Solar e Eólica)',
        icone: 'Sun',
        descricao:
          'Parques solares fotovoltaicos, usinas eólicas e subestações de geração e distribuição de energia',
      },
      {
        nome: 'Posto de Combustíveis e GNV',
        icone: 'Fuel',
        descricao:
          'Instalações de armazenamento de inflamáveis, tanques subterrâneos e postos revendedores de combustíveis',
      },
      {
        nome: 'Saneamento e Estações de Tratamento',
        icone: 'Droplets',
        descricao:
          'Estações de tratamento de água (ETA), esgotamento sanitário (ETE) e redes de distribuição',
      },
      {
        nome: 'Construção Civil e Edificações',
        icone: 'HardHat',
        descricao:
          'Obras de infraestrutura urbana, pontes, rodovias, edificações verticais e loteamentos',
      },
    ]

    for (let i = 0; i < additionalTipos.length; i++) {
      const item = additionalTipos[i]
      try {
        app.findFirstRecordByData('tipos_empreendimento', 'nome', item.nome)
      } catch (_) {
        const record = new Record(tiposCollection)
        record.set('nome', item.nome)
        record.set('icone', item.icone)
        record.set('descricao', item.descricao)
        app.save(record)
      }
    }
  },
  (app) => {
    // Revert logic: we do not delete all records, but can remove seeded ones if necessary
  },
)
