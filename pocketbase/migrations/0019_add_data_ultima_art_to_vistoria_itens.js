migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('vistoria_itens')

    if (!col.fields.getByName('dataUltimaArt')) {
      col.fields.add(
        new DateField({
          name: 'dataUltimaArt',
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('vistoria_itens')
      col.fields.removeByName('dataUltimaArt')
      app.save(col)
    } catch (_) {}
  },
)
