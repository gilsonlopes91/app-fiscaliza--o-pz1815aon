migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('vistoria_itens')

    if (!col.fields.getByName('dataUltimoServico')) {
      col.fields.add(
        new DateField({
          name: 'dataUltimoServico',
        }),
      )
    }

    app.save(col)

    // Se já existirem registros preenchidos com dataUltimaVerificacao,
    // sincroniza dataUltimoServico para manter consistência histórica
    try {
      app
        .db()
        .newQuery(`
        UPDATE vistoria_itens
        SET dataUltimoServico = dataUltimaVerificacao
        WHERE dataUltimaVerificacao IS NOT NULL
          AND dataUltimaVerificacao != ''
          AND (dataUltimoServico IS NULL OR dataUltimoServico = '')
      `)
        .execute()
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('vistoria_itens')
      col.fields.removeByName('dataUltimoServico')
      app.save(col)
    } catch (_) {}
  },
)
