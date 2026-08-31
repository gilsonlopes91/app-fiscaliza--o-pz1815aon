migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('vistoria_itens')

    // 1. Add servicoPeriodico select field ('Sim' | 'Não')
    if (!col.fields.getByName('servicoPeriodico')) {
      col.fields.add(
        new SelectField({
          name: 'servicoPeriodico',
          values: ['Sim', 'Não'],
          maxSelect: 1,
        }),
      )
    }

    // 2. Add fotos file field (max 3 files, images up to 10MB each)
    if (!col.fields.getByName('fotos')) {
      col.fields.add(
        new FileField({
          name: 'fotos',
          maxSelect: 3,
          maxSize: 10485760, // 10MB
          mimeTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/heic',
            'image/heif',
          ],
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('vistoria_itens')
      col.fields.removeByName('servicoPeriodico')
      col.fields.removeByName('fotos')
      app.save(col)
    } catch (_) {}
  },
)
