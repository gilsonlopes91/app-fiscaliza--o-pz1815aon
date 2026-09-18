migrate(
  (app) => {
    // 1. Atualizar select field 'status' em vistorias para permitir: 'em_andamento', 'concluida', 'cancelada'
    const vistoriasCol = app.findCollectionByNameOrId('vistorias')
    const statusField = vistoriasCol.fields.getByName('status')
    if (statusField) {
      statusField.values = ['em_andamento', 'concluida', 'cancelada']
      statusField.maxSelect = 1
      app.save(vistoriasCol)
    }

    // 2. Limpeza de vistorias sem fiscal ativo na collection 'atribuicoes'
    // Excluir toda vistoria cujo hospital não tenha registro correspondente com fiscal na collection atribuicoes,
    // removendo antes os registros dependentes (vistoria_itens).
    try {
      // Obter IDs de hospitais que POSSUEM atribuição com fiscal não-nulo e não-vazio
      const atribuicoes = app.findRecordsByFilter(
        'atribuicoes',
        'fiscal != "" && hospital != ""',
        '-created',
        5000,
        0,
      )
      const validHospitalIds = new Set()
      for (const a of atribuicoes) {
        const hospId = a.getString('hospital')
        const fiscalId = a.getString('fiscal')
        if (hospId && fiscalId) {
          validHospitalIds.add(hospId)
        }
      }

      // Buscar todas as vistorias
      const allVistorias = app.findRecordsByFilter('vistorias', '', '-created', 5000, 0)
      for (const vistoria of allVistorias) {
        const hospId = vistoria.getString('hospital')
        if (!hospId || !validHospitalIds.has(hospId)) {
          // Vistoria sem fiscal vinculado: remover dependências e depois a vistoria
          const vistoriaId = vistoria.id

          // 2.1 Remover itens da vistoria (vistoria_itens)
          try {
            const itens = app.findRecordsByFilter(
              'vistoria_itens',
              `vistoria = "${vistoriaId}"`,
              '-created',
              5000,
              0,
            )
            for (const item of itens) {
              app.delete(item)
            }
          } catch (eItem) {
            console.log('Erro ao remover itens de vistoria sem fiscal:', eItem)
          }

          // 2.2 Remover a vistoria
          try {
            app.delete(vistoria)
          } catch (eVist) {
            console.log('Erro ao remover vistoria sem fiscal:', eVist)
          }
        }
      }
    } catch (err) {
      console.log('Erro durante limpeza de vistorias sem fiscal vinculado:', err)
    }
  },
  (app) => {
    try {
      const vistoriasCol = app.findCollectionByNameOrId('vistorias')
      const statusField = vistoriasCol.fields.getByName('status')
      if (statusField) {
        statusField.values = ['em_andamento', 'concluida']
        statusField.maxSelect = 1
        app.save(vistoriasCol)
      }
    } catch (_) {}
  },
)
