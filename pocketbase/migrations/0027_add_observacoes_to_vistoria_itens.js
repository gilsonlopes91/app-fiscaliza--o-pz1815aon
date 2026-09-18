migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('vistoria_itens')

    if (!col.fields.getByName('observacoes')) {
      col.fields.add(
        new TextField({
          name: 'observacoes',
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('vistoria_itens')
      col.fields.removeByName('observacoes')
      app.save(col)
    } catch (_) {}
  },
)
