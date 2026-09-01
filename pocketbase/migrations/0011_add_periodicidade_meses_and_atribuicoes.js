migrate(
  (app) => {
    // 1. Add periodicidadeMeses to vistoria_itens if not exists
    const vistoriaItensCol = app.findCollectionByNameOrId('vistoria_itens')
    if (!vistoriaItensCol.fields.getByName('periodicidadeMeses')) {
      vistoriaItensCol.fields.add(
        new NumberField({
          name: 'periodicidadeMeses',
          min: 1,
          onlyInt: true,
        }),
      )
      app.save(vistoriaItensCol)
    }

    // 2. Create atribuicoes collection
    const hospitaisCol = app.findCollectionByNameOrId('hospitais')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    try {
      app.findCollectionByNameOrId('atribuicoes')
    } catch (_) {
      const atribuicoesCol = new Collection({
        name: 'atribuicoes',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          {
            name: 'fiscal',
            type: 'relation',
            required: true,
            collectionId: usersCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'hospital',
            type: 'relation',
            required: true,
            collectionId: hospitaisCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'created_by',
            type: 'relation',
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'observacao',
            type: 'text',
          },
          {
            name: 'prazo',
            type: 'date',
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_atribuicoes_fiscal ON atribuicoes (fiscal)',
          'CREATE INDEX idx_atribuicoes_hospital ON atribuicoes (hospital)',
        ],
      })
      app.save(atribuicoesCol)
    }
  },
  (app) => {
    try {
      const atribuicoes = app.findCollectionByNameOrId('atribuicoes')
      app.delete(atribuicoes)
    } catch (_) {}

    try {
      const col = app.findCollectionByNameOrId('vistoria_itens')
      col.fields.removeByName('periodicidadeMeses')
      app.save(col)
    } catch (_) {}
  },
)
