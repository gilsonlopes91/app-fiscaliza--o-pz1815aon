migrate(
  (app) => {
    const vistorias = app.findCollectionByNameOrId('vistorias')

    // Caracterização do empreendimento rural (culturas, criação animal e
    // estruturas) registrada em cada vistoria — muda de safra para safra.
    if (!vistorias.fields.getByName('caracterizacao')) {
      vistorias.fields.add(
        new JSONField({
          name: 'caracterizacao',
          maxSize: 200000,
        }),
      )
      app.save(vistorias)
      console.log('Campo caracterizacao criado em vistorias.')
    }
  },
  (app) => {
    try {
      const vistorias = app.findCollectionByNameOrId('vistorias')
      vistorias.fields.removeByName('caracterizacao')
      app.save(vistorias)
    } catch (_) {}
  },
)
