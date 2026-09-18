migrate(
  (app) => {
    const hospitais = app.findCollectionByNameOrId('hospitais')

    // Campos do cabeçalho do "Relatório de Visita ao Produtor Rural" e dados
    // de contato do empreendimento que faltavam no cadastro.
    const novosCampos = [
      'inscricao_estadual',
      'cpf',
      'cep',
      'email',
      'telefone',
      'cargo_responsavel',
      'ano_safra',
    ]

    let criados = 0
    for (let i = 0; i < novosCampos.length; i++) {
      const nome = novosCampos[i]
      if (!hospitais.fields.getByName(nome)) {
        hospitais.fields.add(
          new TextField({
            name: nome,
          }),
        )
        criados++
      }
    }

    if (criados > 0) {
      app.save(hospitais)
    }

    console.log('Campos adicionados em hospitais: ' + criados)
  },
  (app) => {
    try {
      const hospitais = app.findCollectionByNameOrId('hospitais')
      const campos = [
        'inscricao_estadual',
        'cpf',
        'cep',
        'email',
        'telefone',
        'cargo_responsavel',
        'ano_safra',
      ]
      for (let i = 0; i < campos.length; i++) {
        hospitais.fields.removeByName(campos[i])
      }
      app.save(hospitais)
    } catch (_) {}
  },
)
