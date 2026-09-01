migrate(
  (app) => {
    const hospitais = app.findCollectionByNameOrId('hospitais')

    const collection = new Collection({
      name: 'itens_fiscalizacao',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'hospital',
          type: 'relation',
          required: true,
          collectionId: hospitais.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'nome',
          type: 'text',
          required: true,
        },
        {
          name: 'categoria',
          type: 'text',
          required: true,
        },
        {
          name: 'descricao',
          type: 'text',
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Conforme', 'Não Conforme'],
          maxSelect: 1,
        },
        {
          name: 'observacao',
          type: 'text',
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_itens_fisc_hospital ON itens_fiscalizacao (hospital)',
        'CREATE INDEX idx_itens_fisc_categoria ON itens_fiscalizacao (categoria)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('itens_fiscalizacao')
      app.delete(collection)
    } catch (_) {}
  },
)
