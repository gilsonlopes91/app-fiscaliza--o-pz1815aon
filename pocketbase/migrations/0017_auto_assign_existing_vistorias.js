migrate(
  (app) => {
    // Para vistorias que já estão em andamento ou têm itens salvos na base
    // mas não possuem registro de atribuição para o empreendimento,
    // vincula ao primeiro fiscal/admin existente no sistema para que passem
    // a ser contabilizadas no Painel Geral.
    let atribuicoesCol
    let hospitaisCol
    let usersCol
    let vistoriasCol
    let itensCol

    try {
      atribuicoesCol = app.findCollectionByNameOrId('atribuicoes')
      hospitaisCol = app.findCollectionByNameOrId('hospitais')
      usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      vistoriasCol = app.findCollectionByNameOrId('vistorias')
      itensCol = app.findCollectionByNameOrId('vistoria_itens')
    } catch (_) {
      return
    }

    // Busca usuário padrão para associar dados pré-existentes
    let defaultUser = null
    try {
      defaultUser = app.findAuthRecordByEmail('_pb_users_auth_', 'gilsonlopes2991@gmail.com')
    } catch (_) {
      try {
        const users = app.findRecordsByFilter(
          '_pb_users_auth_',
          'approved = true || approvalStatus = "aprovado"',
          '-created',
          1,
          0,
        )
        if (users && users.length > 0) {
          defaultUser = users[0]
        }
      } catch (_) {}
    }

    if (!defaultUser) return

    // Busca todas as vistorias existentes
    try {
      const vistorias = app.findRecordsByFilter('vistorias', '', '-created', 500, 0)
      for (const v of vistorias) {
        const hospitalId = v.getString('hospital')
        if (!hospitalId) continue

        // Verifica se já existe atribuição para esse hospital
        const existingAtribs = app.findRecordsByFilter(
          'atribuicoes',
          `hospital = "${hospitalId}"`,
          '-created',
          1,
          0,
        )
        if (existingAtribs && existingAtribs.length > 0) {
          continue // Já tem atribuição
        }

        // Verifica se essa vistoria tem algum item respondido
        const itens = app.findRecordsByFilter(
          'vistoria_itens',
          `vistoria = "${v.id}"`,
          '-created',
          1,
          0,
        )

        // Se tem itens respondidos ou está com status concluida
        if ((itens && itens.length > 0) || v.getString('status') === 'concluida') {
          const record = new Record(atribuicoesCol)
          record.set('fiscal', defaultUser.id)
          record.set('hospital', hospitalId)
          record.set('created_by', defaultUser.id)
          record.set('observacao', 'Atribuição automática vinculada ao checklist em andamento')
          app.save(record)
        }
      }
    } catch (err) {
      console.log('Erro ao migrar vistorias para atribuicoes:', err)
    }
  },
  (app) => {
    // Down migration: remove auto-atribuições criadas com a observação padrão
    try {
      const records = app.findRecordsByFilter(
        'atribuicoes',
        'observacao = "Atribuição automática vinculada ao checklist em andamento"',
        '-created',
        500,
        0,
      )
      for (const rec of records) {
        app.delete(rec)
      }
    } catch (_) {}
  },
)
