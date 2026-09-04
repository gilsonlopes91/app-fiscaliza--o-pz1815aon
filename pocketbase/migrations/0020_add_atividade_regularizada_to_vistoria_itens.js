migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('vistoria_itens')

    if (!col.fields.getByName('atividadeRegularizada')) {
      col.fields.add(
        new SelectField({
          name: 'atividadeRegularizada',
          values: ['Sim', 'Não'],
          maxSelect: 1,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('vistoria_itens')
      col.fields.removeByName('atividadeRegularizada')
      app.save(col)
    } catch (_) {}
  },
)
