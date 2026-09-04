migrate(
  (app) => {
    // 1. Alter categorias_vistoria:
    // Add 'ordem' (number) for ordering main items 1, 2, 3...
    const catCol = app.findCollectionByNameOrId('categorias_vistoria')
    if (!catCol.fields.getByName('ordem')) {
      catCol.fields.add(
        new NumberField({
          name: 'ordem',
          onlyInt: true,
        }),
      )
      app.save(catCol)
    }

    // Assign sequential order (1..10) to the 10 existing hospital main items if not set
    const hospitalCats = app.findRecordsByFilter(
      'categorias_vistoria',
      "tipo = 'Hospital' || tipo = ''",
      'created',
      100,
      0,
    )
    for (let i = 0; i < hospitalCats.length; i++) {
      const cat = hospitalCats[i]
      if (!cat.get('ordem') || cat.get('ordem') === 0) {
        cat.set('ordem', i + 1)
        app.save(cat)
      }
    }

    // 2. Create subitens_checklist collection
    let subCol
    try {
      subCol = app.findCollectionByNameOrId('subitens_checklist')
    } catch (_) {
      subCol = new Collection({
        name: 'subitens_checklist',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          {
            name: 'categoria',
            type: 'relation',
            required: true,
            collectionId: catCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'tipo', type: 'text' },
          { name: 'ordem', type: 'number', onlyInt: true },
          { name: 'codigo', type: 'text' },
          { name: 'descricao', type: 'text', required: true },
          { name: 'exigeArt', type: 'bool' },
          { name: 'periodicidadeDias', type: 'number', onlyInt: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_subitens_categoria ON subitens_checklist (categoria)',
          'CREATE INDEX idx_subitens_tipo ON subitens_checklist (tipo)',
        ],
      })
      app.save(subCol)
    }

    // 3. Add 'subitem' relation field to vistoria_itens if not present
    const vistoriaItensCol = app.findCollectionByNameOrId('vistoria_itens')
    if (!vistoriaItensCol.fields.getByName('subitem')) {
      vistoriaItensCol.fields.add(
        new RelationField({
          name: 'subitem',
          collectionId: subCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
      vistoriaItensCol.addIndex('idx_vistoria_itens_subitem', false, 'subitem', '')
      app.save(vistoriaItensCol)
    }

    // 4. Migrate existing data:
    // For each existing category, create an initial subitem (e.g., 1.1) so that
    // existing vistoria_itens can link to it and nothing is lost.
    const allExistingCats = app.findRecordsByFilter(
      'categorias_vistoria',
      '',
      'ordem,created',
      500,
      0,
    )
    for (let i = 0; i < allExistingCats.length; i++) {
      const cat = allExistingCats[i]
      const catOrdem = cat.get('ordem') || i + 1
      const subCode = `${catOrdem}.1`

      let existingSub
      try {
        existingSub = app.findFirstRecordByData('subitens_checklist', 'categoria', cat.id)
      } catch (_) {
        existingSub = null
      }

      if (!existingSub) {
        const newSub = new Record(subCol)
        newSub.set('categoria', cat.id)
        newSub.set('tipo', cat.get('tipo') || 'Hospital')
        newSub.set('ordem', 1)
        newSub.set('codigo', subCode)
        newSub.set('descricao', cat.get('nome'))
        newSub.set('exigeArt', cat.get('exigeArt') !== false)
        const perDias = cat.get('periodicidadeDias')
        if (perDias && perDias > 0) {
          newSub.set('periodicidadeDias', perDias)
        } else {
          newSub.set('periodicidadeDias', null)
        }
        app.save(newSub)
        existingSub = newSub
      }

      // Link any existing vistoria_itens referencing this categoria to this new subitem if empty
      app
        .db()
        .newQuery(
          'UPDATE vistoria_itens SET subitem = {:subId} WHERE categoria = {:catId} AND (subitem IS NULL OR subitem = "")',
        )
        .bind({ subId: existingSub.id, catId: cat.id })
        .execute()
    }
  },
  (app) => {
    // Down migration
    try {
      const subCol = app.findCollectionByNameOrId('subitens_checklist')
      app.delete(subCol)
    } catch (_) {}
  },
)
