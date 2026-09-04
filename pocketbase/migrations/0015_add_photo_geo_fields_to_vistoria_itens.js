migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('vistoria_itens')

    if (!col.fields.getByName('latitude')) {
      col.fields.add(
        new NumberField({
          name: 'latitude',
        }),
      )
    }

    if (!col.fields.getByName('longitude')) {
      col.fields.add(
        new NumberField({
          name: 'longitude',
        }),
      )
    }

    if (!col.fields.getByName('dataCaptura')) {
      col.fields.add(
        new DateField({
          name: 'dataCaptura',
        }),
      )
    }

    if (!col.fields.getByName('fotoMetadata')) {
      col.fields.add(
        new JSONField({
          name: 'fotoMetadata',
          maxSize: 1048576, // 1MB for storing array of metadata per photo
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('vistoria_itens')
      col.fields.removeByName('latitude')
      col.fields.removeByName('longitude')
      col.fields.removeByName('dataCaptura')
      col.fields.removeByName('fotoMetadata')
      app.save(col)
    } catch (_) {}
  },
)
