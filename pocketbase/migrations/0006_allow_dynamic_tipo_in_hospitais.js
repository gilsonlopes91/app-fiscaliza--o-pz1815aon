migrate(
  (app) => {
    // Modify hospitais table: change tipo field to plain text if it's currently a select with fixed choices
    // In PocketBase SQLite, we can update the collection definition so 'tipo' is a text field
    const hospitais = app.findCollectionByNameOrId('hospitais')

    // Check if tipo is a select field, and change to text field if needed
    const tipoField = hospitais.fields.getByName('tipo')
    if (tipoField && tipoField.type !== 'text') {
      hospitais.fields.removeByName('tipo')
      hospitais.fields.add(
        new TextField({
          name: 'tipo',
        }),
      )
      app.save(hospitais)
    }

    // Default existing hospitals that have empty or old select tipo to 'Hospital' if null or standard
    app
      .db()
      .newQuery(`
      UPDATE hospitais 
      SET tipo = 'Hospital' 
      WHERE tipo IS NULL OR tipo = '' OR tipo = 'Hospital Geral' OR tipo = 'Hospital Especializado' OR tipo = 'Hospital-Dia'
    `)
      .execute()
  },
  (app) => {},
)
