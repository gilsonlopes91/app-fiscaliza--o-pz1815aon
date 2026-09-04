migrate(
  (app) => {
    // 1. Atualizar select field 'possuiSistema' em vistoria_itens para incluir 'Não se aplica'
    const itensCol = app.findCollectionByNameOrId('vistoria_itens')
    const field = itensCol.fields.getByName('possuiSistema')
    if (field) {
      field.values = ['Sim', 'Não', 'Não se aplica']
      field.maxSelect = 1
      app.save(itensCol)
    }

    // 2. Garantir que todas as vistorias existentes sem status ou com status vazio fiquem 'em_andamento'
    app
      .db()
      .newQuery(`
      UPDATE vistorias
      SET status = 'em_andamento'
      WHERE status IS NULL OR status = ''
    `)
      .execute()
  },
  (app) => {
    try {
      const itensCol = app.findCollectionByNameOrId('vistoria_itens')
      const field = itensCol.fields.getByName('possuiSistema')
      if (field) {
        field.values = ['Sim', 'Não']
        field.maxSelect = 1
        app.save(itensCol)
      }
    } catch (_) {}
  },
)
