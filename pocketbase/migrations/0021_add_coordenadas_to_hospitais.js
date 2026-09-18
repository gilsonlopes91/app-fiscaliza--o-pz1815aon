migrate(
  (app) => {
    const hospitais = app.findCollectionByNameOrId('hospitais')

    // 1. Coordenadas geográficas (grau decimal, gravadas como texto para
    //    permitir campo vazio sem confundir com 0,0).
    if (!hospitais.fields.getByName('latitude')) {
      hospitais.fields.add(
        new TextField({
          name: 'latitude',
        }),
      )
    }

    if (!hospitais.fields.getByName('longitude')) {
      hospitais.fields.add(
        new TextField({
          name: 'longitude',
        }),
      )
    }

    // 2. O CNES só existe para estabelecimentos de saúde. Deixa de ser
    //    obrigatório no banco; a exigência passa a ser feita no formulário,
    //    apenas para os tipos de saúde.
    try {
      const cnes = hospitais.fields.getByName('cnes')
      if (cnes && cnes.required) {
        cnes.required = false
      }
    } catch (_) {}

    app.save(hospitais)
  },
  (app) => {
    try {
      const hospitais = app.findCollectionByNameOrId('hospitais')
      hospitais.fields.removeByName('latitude')
      hospitais.fields.removeByName('longitude')
      app.save(hospitais)
    } catch (_) {}
  },
)
