migrate(
  (app) => {
    // 1. Update categorias_vistoria collection to add 'tipo' (text) field
    const categoriasCol = app.findCollectionByNameOrId('categorias_vistoria')

    if (!categoriasCol.fields.getByName('tipo')) {
      categoriasCol.fields.add(
        new TextField({
          name: 'tipo',
        }),
      )
    }

    // Drop previous unique index on nome if any, or recreate composite index (tipo, nome)
    try {
      categoriasCol.removeIndex('idx_categorias_vistoria_nome')
    } catch (_) {}

    categoriasCol.addIndex('idx_categorias_vistoria_tipo', false, 'tipo', '')

    app.save(categoriasCol)

    // 2. Set 'Hospital' as the default tipo for all existing categorias_vistoria
    app
      .db()
      .newQuery("UPDATE categorias_vistoria SET tipo = 'Hospital' WHERE tipo IS NULL OR tipo = ''")
      .execute()
  },
  (app) => {
    try {
      const categoriasCol = app.findCollectionByNameOrId('categorias_vistoria')
      if (categoriasCol.fields.getByName('tipo')) {
        categoriasCol.fields.removeByName('tipo')
        app.save(categoriasCol)
      }
    } catch (_) {}
  },
)
