migrate(
  (app) => {
    // --------------------------------------------------------------------------
    // MIGRATION: 0014_update_hospital_checklist_structure.js
    // Substitui o checklist antigo de Hospital (10 itens soltos) pela estrutura
    // completa de dois níveis com 16 itens principais (agrupadores) e seus subitens.
    // Todos os subitens são criados com exigeArt = false e periodicidadeDias = null.
    // Idempotente: se a migration já tiver inserido as 16 categorias novas, não duplica.
    // --------------------------------------------------------------------------

    const catCol = app.findCollectionByNameOrId('categorias_vistoria')
    const subCol = app.findCollectionByNameOrId('subitens_checklist')

    // 1. Definição da nova estrutura completa de Hospital
    const novaEstruturaHospital = [
      {
        ordem: 1,
        nome: 'Ar-condicionado, Sistemas de Refrigeração, Exaustão e Ventilação Forçada',
        subitens: [
          {
            codigo: '1.1',
            descricao:
              'Projetos de Sistemas Térmicos: de Condicionamento de Ar, de refrigeração, de exaustão e de ventilação/ventilação forçada',
          },
          {
            codigo: '1.2',
            descricao:
              'Laudo de Sistemas Térmicos: de Condicionamento de Ar, de refrigeração, de exaustão e de ventilação/ventilação forçada',
          },
          {
            codigo: '1.3',
            descricao:
              'Execução de Fabricação e/ou Inspeção de Sistemas Térmicos: de Condicionamento de Ar, de refrigeração, de exaustão e de ventilação/ventilação forçada',
          },
          {
            codigo: '1.4',
            descricao:
              'Execução de Instalação e/ou Execução de Manutenção de Sistemas Térmicos: de Condicionamento de Ar, de refrigeração, de exaustão e de ventilação/ventilação forçada',
          },
          {
            codigo: '1.5',
            descricao: 'Monitoramento (Análise da qualidade do ar)/Sistemas Térmicos de Ventilação',
          },
          {
            codigo: '1.6',
            descricao:
              'Supervisão, elaboração/execução, coordenação, revisão e aplicação/Operação de PMOC',
          },
        ],
      },
      {
        ordem: 2,
        nome: 'Caldeiras, autoclaves e vasos sob pressão (sistema de gases medicinais, de ar comprimido e de vácuo)',
        subitens: [
          {
            codigo: '2.1',
            descricao:
              'Projeto de Sistemas Térmicos: de autoclaves e de caldeiras e Sistemas cilindro/vasos de pressão',
          },
          {
            codigo: '2.2',
            descricao:
              'Laudo de Sistemas Térmicos: de autoclaves e de caldeiras e Sistemas Fluidodinâmicos: cilindro/vasos de pressão',
          },
          {
            codigo: '2.3',
            descricao:
              'Execução de Fabricação, Treinamento de operadores e Execução de Reforma de Sistemas Térmicos: de autoclaves e de caldeiras e Sistemas Fluidodinâmicos: de cilindro/vasos de pressão',
          },
          {
            codigo: '2.4',
            descricao:
              'Inspeção e/ou Execução de Sistemas Térmicos: de autoclaves e de caldeiras e Sistemas Fluidodinâmicos: de cilindro/vasos de pressão',
          },
          {
            codigo: '2.5',
            descricao:
              'Execução de Manutenção de Sistemas Térmicos: de autoclaves e de caldeiras e Sistemas Fluidodinâmicos: de cilindro/vasos de pressão',
          },
          {
            codigo: '2.6',
            descricao:
              'Controle de qualidade ambiental de emissão dos gases de alta temperatura (diluição, minimização e neutralização) em projeto específico ou como parte integrante de outro projeto/Controle de qualidade de segurança em redes e tubulações de fluidos, gases e vapores',
          },
        ],
      },
      {
        ordem: 3,
        nome: 'Central de G.L.P.',
        subitens: [
          {
            codigo: '3.1',
            descricao: 'Projeto de sistema e redes de G.L.P.',
          },
          {
            codigo: '3.2',
            descricao: 'Laudo sobre sistema e redes de central de G.L.P.',
          },
          {
            codigo: '3.3',
            descricao: 'Laudo sobre os equipamentos/cilindros de G.L.P.',
          },
          {
            codigo: '3.4',
            descricao: 'Execução de Instalação de Sistemas e redes de G.L.P.',
          },
          {
            codigo: '3.5',
            descricao: 'Execução de Manutenção de sistemas e redes de central de G.L.P.',
          },
        ],
      },
      {
        ordem: 4,
        nome: 'Elevadores, escadas rolantes e equipamentos de elevação e transporte',
        subitens: [
          {
            codigo: '4.1',
            descricao:
              'Projeto de elevadores e transportadores: escadas rolantes e equipamentos de elevação e transporte',
          },
          {
            codigo: '4.2',
            descricao:
              'Laudo de elevadores e transportadores: escadas rolantes e equipamentos de elevação e transporte',
          },
          {
            codigo: '4.3',
            descricao:
              'Execução de Fabricação de elevadores e transportadores: escadas rolantes e equipamentos de elevação e transporte',
          },
          {
            codigo: '4.4',
            descricao:
              'Inspeção e/ou Execução de Instalação de elevadores e transportadores: escadas rolantes e equipamentos de elevação e transporte',
          },
          {
            codigo: '4.5',
            descricao:
              'Execução de Manutenção de elevadores e transportadores: escadas rolantes e equipamentos de elevação e transporte',
          },
        ],
      },
      {
        ordem: 5,
        nome: 'Grupo Gerador',
        subitens: [
          {
            codigo: '5.1',
            descricao: 'Projeto de instalação de grupos geradores de energia elétrica',
          },
          {
            codigo: '5.2',
            descricao: 'Laudo sobre instalação de grupos geradores de energia elétrica',
          },
          {
            codigo: '5.3',
            descricao: 'Laudo sobre equipamento grupo gerador de energia elétrica',
          },
          {
            codigo: '5.4',
            descricao:
              'Execução de Instalação e/ou de Manutenção de instalação de grupo gerador de energia elétrica',
          },
        ],
      },
      {
        ordem: 6,
        nome: 'Instalações Elétricas',
        subitens: [
          {
            codigo: '6.1',
            descricao: 'Projeto de instalações elétricas em baixa tensão',
          },
          {
            codigo: '6.2',
            descricao: 'Projeto de instalações elétricas em alta tensão',
          },
          {
            codigo: '6.3',
            descricao:
              'Laudo de instalações elétricas em baixa tensão para construções provisórias ou permanentes',
          },
          {
            codigo: '6.4',
            descricao: 'Laudo de instalações elétricas em alta tensão',
          },
          {
            codigo: '6.5',
            descricao: 'Execução de Manutenção das instalações elétricas em baixa tensão',
          },
          {
            codigo: '6.6',
            descricao: 'Execução de Manutenção das instalações elétricas em alta tensão',
          },
        ],
      },
      {
        ordem: 7,
        nome: 'Sistema de Proteção contra Descargas Atmosféricas (SPDA)',
        subitens: [
          {
            codigo: '7.1',
            descricao: 'Projeto de SPDA',
          },
          {
            codigo: '7.2',
            descricao: 'Laudo, perícia e parecer sobre SPDA',
          },
          {
            codigo: '7.3',
            descricao: 'Execução de Instalação e/ou de Manutenção de SPDA',
          },
        ],
      },
      {
        ordem: 8,
        nome: 'Circuito Fechado de Televisão (CFTV)',
        subitens: [
          {
            codigo: '8.1',
            descricao: 'Projeto de CFTV',
          },
          {
            codigo: '8.2',
            descricao: 'Laudo sobre CFTV',
          },
          {
            codigo: '8.3',
            descricao: 'Execução de Instalação e/ou de Manutenção de CFTV',
          },
        ],
      },
      {
        ordem: 9,
        nome: 'Instalações Telefônicas e de Lógica',
        subitens: [
          {
            codigo: '9.1',
            descricao: 'Projeto de instalações telefônicas e de lógica/rede de dados',
          },
          {
            codigo: '9.2',
            descricao: 'Laudo sobre instalações telefônicas e de lógica/rede de dados',
          },
          {
            codigo: '9.3',
            descricao:
              'Execução de Instalação e de Manutenção de instalações telefônicas e de lógica',
          },
        ],
      },
      {
        ordem: 10,
        nome: 'Controle de Pragas Urbanas – Desinsetização e Desratização',
        subitens: [
          {
            codigo: '10.1',
            descricao: 'Elaboração de Projeto de Controle de pragas e vetores',
          },
          {
            codigo: '10.2',
            descricao:
              'Supervisão e coordenação do manuseio e da aplicação de produtos domissanitários',
          },
        ],
      },
      {
        ordem: 11,
        nome: 'Plano de Gerenciamento de Resíduos de Serviços de Saúde – PGRSS',
        subitens: [
          {
            codigo: '11.1',
            descricao:
              'Elaboração do PGRSS do estabelecimento (incluindo o manejo de material permanente, órteses e próteses)',
          },
          {
            codigo: '11.2',
            descricao: 'Supervisão e coordenação da execução do PGRSS',
          },
          {
            codigo: '11.3',
            descricao:
              'Elaboração do PGRSS dos prestadores de serviço que geram resíduos no estabelecimento (ex. filtros de ar-condicionado, peças de equipamentos médico-hospitalares, serviço terceirizado de ambulâncias)',
          },
        ],
      },
      {
        ordem: 12,
        nome: 'Sistemas de Prevenção e Combate à Incêndios',
        subitens: [
          {
            codigo: '12.1',
            descricao:
              'Sistemas de Hidrantes - Projeto de sistema de instalação de rede de hidrantes (hidráulico)',
          },
          {
            codigo: '12.2',
            descricao:
              'Sistemas de Hidrantes - Laudo sobre sistema de instalação de rede de hidrantes (hidráulico)',
          },
          {
            codigo: '12.3',
            descricao:
              'Sistemas de Hidrantes - Execução de Instalação e de Manutenção de sistema de instalação de rede de hidrantes (hidráulico)',
          },
          {
            codigo: '12.4',
            descricao:
              'Sistema Fixo de Gases Limpos de Combate a Incêndio - Projeto de Prevenção Contra Incêndio e Pânico - PPCIP',
          },
          {
            codigo: '12.5',
            descricao:
              'Sistema de Chuveiros Automáticos/Sprinklers - Projeto de sistema de chuveiros automáticos/Sprinklers',
          },
          {
            codigo: '12.6',
            descricao:
              'Sistema de Chuveiros Automáticos/Sprinklers - Laudo sobre sistema de chuveiros automáticos/Sprinklers',
          },
          {
            codigo: '12.7',
            descricao:
              'Sistema de Chuveiros Automáticos/Sprinklers - Execução de Instalação e de Manutenção de sistema de chuveiros automáticos/Sprinklers',
          },
          {
            codigo: '12.8',
            descricao:
              'Sistema de Controle de Fumaça - Projeto de sistema de controle de fumaça/Sistemas de Detecção e Alarme de Incêndio',
          },
          {
            codigo: '12.9',
            descricao:
              'Sistema de Controle de Fumaça - Laudo sobre sistema de controle de fumaça/Sistemas de Detecção e Alarme de Incêndio',
          },
          {
            codigo: '12.10',
            descricao:
              'Sistema de Controle de Fumaça - Execução de Instalação e de Manutenção de sistema de controle de fumaça/Sistemas de Detecção e Alarme de Incêndio',
          },
          {
            codigo: '12.11',
            descricao:
              'Sistema de Pressurização de Escadas - Projeto de sistema de pressurização de escadas de emergência',
          },
          {
            codigo: '12.12',
            descricao:
              'Sistema de Pressurização de Escadas - Laudos sobre sistema de pressurização de escadas de emergência',
          },
          {
            codigo: '12.13',
            descricao:
              'Sistema de Pressurização de Escadas - Execução de Instalação e de Manutenção de sistema de pressurização de escadas de emergência',
          },
          {
            codigo: '12.14',
            descricao:
              'Sistema de Alarme e Detecção de Incêndio - Projeto de sistema detecção e alarme de incêndio',
          },
          {
            codigo: '12.15',
            descricao:
              'Sistema de Alarme e Detecção de Incêndio - Laudo sobre sistema detecção e de alarme de incêndio (funcionamento)',
          },
          {
            codigo: '12.16',
            descricao:
              'Sistema de Alarme e Detecção de Incêndio - Execução de Instalação e de Manutenção de sistema detecção de incêndio e alarme',
          },
          {
            codigo: '12.17',
            descricao:
              'Sinalização de Emergência - Projeto Prevenção Contra Incêndio e Pânico - PPCIP',
          },
          {
            codigo: '12.18',
            descricao:
              'Sinalização de Emergência - Laudo sobre adequação de sinalização de emergência',
          },
          {
            codigo: '12.19',
            descricao:
              'Sinalização de Emergência - Execução de instalação de sinalização de emergência',
          },
          {
            codigo: '12.20',
            descricao:
              'Extintor de Incêndio - Projeto de combate e prevenção contra incêndio e pânicos',
          },
          {
            codigo: '12.21',
            descricao:
              'Extintor de Incêndio - Laudo sobre adequação, quanto às normas de segurança, de instalações de extintores em edificações',
          },
          {
            codigo: '12.22',
            descricao: 'Extintor de Incêndio - Laudo sobre equipamento extintor',
          },
          {
            codigo: '12.23',
            descricao: 'Extintor de Incêndio - Execução de Instalação de Extintores',
          },
          {
            codigo: '12.24',
            descricao:
              'Extintor de Incêndio - Fabricação, Inspeção e Reteste de extintor de incêndios',
          },
          {
            codigo: '12.25',
            descricao: 'Extintor de Incêndio - Manutenção e recarga de extintor de incêndios',
          },
        ],
      },
      {
        ordem: 13,
        nome: 'Equipamentos de Saúde – Plano de Gerenciamento de Equipamentos de Saúde – PGES',
        subitens: [
          {
            codigo: '13.1',
            descricao: 'Elaboração do PGES',
          },
          {
            codigo: '13.2',
            descricao: 'Supervisão e Coordenação da execução do PGES/serviço técnico',
          },
          {
            codigo: '13.3',
            descricao:
              'Elaboração de especificação de aquisição de equipamento de saúde/serviço técnico',
          },
          {
            codigo: '13.4',
            descricao:
              'Laudo de funcionamento e descarte/desativação de equipamento de saúde/serviço técnico',
          },
          {
            codigo: '13.5',
            descricao:
              'Supervisão, coordenação e execução de calibração de equipamento de saúde/serviço técnico',
          },
          {
            codigo: '13.6',
            descricao:
              'Supervisão, coordenação e execução de manutenção, reparação e assistência técnica de Equipamentos de Saúde/serviço técnico',
          },
        ],
      },
      {
        ordem: 14,
        nome: 'Qualidade da água e instalações hidrossanitárias',
        subitens: [
          {
            codigo: '14.1',
            descricao: 'Projeto hidráulico',
          },
          {
            codigo: '14.2',
            descricao: 'Projeto hidrossanitário',
          },
          {
            codigo: '14.3',
            descricao: 'Projeto de drenagem de águas pluviais',
          },
          {
            codigo: '14.4',
            descricao: 'Reserva técnica de incêndio',
          },
          {
            codigo: '14.5',
            descricao:
              'Projeto da ETE (caso o EAS possua sistema próprio de tratamento de efluentes)',
          },
        ],
      },
      {
        ordem: 15,
        nome: 'Obras e reformas',
        subitens: [
          {
            codigo: '15.1',
            descricao: 'Obras e reformas',
          },
        ],
      },
      {
        ordem: 16,
        nome: 'Segurança do Trabalho',
        subitens: [
          {
            codigo: '16.1',
            descricao: 'Elaboração do PPRA (NR-32)',
          },
          {
            codigo: '16.2',
            descricao: 'Supervisão e coordenação da execução do PPRA (NR-32)',
          },
          {
            codigo: '16.3',
            descricao: 'Laudo de atividades e operações insalubres (NR 15)',
          },
          {
            codigo: '16.4',
            descricao: 'Laudo de atividades e operações perigosas (NR 16)',
          },
          {
            codigo: '16.5',
            descricao: 'Plano de Evacuação e Abandono do Estabelecimento',
          },
          {
            codigo: '16.6',
            descricao: 'Laudo Técnico das Condições Ambientais de Trabalho – LTCAT',
          },
          {
            codigo: '16.7',
            descricao: 'Laudos, pareceres e dimensionamento de EPIs',
          },
          {
            codigo: '16.8',
            descricao:
              'Treinamento sobre Programa de Prevenção de Riscos Ambientais - PPRA (NR-32)',
          },
          {
            codigo: '16.9',
            descricao: 'Procedimento de verificação de treinamento para funcionários de manutenção',
          },
          {
            codigo: '16.10',
            descricao: 'Analise ergonômica do trabalho – AET (NR 17)',
          },
          {
            codigo: '16.11',
            descricao: 'Proteção Radiológica',
          },
        ],
      },
    ]

    // 2. Buscar categorias e subitens atuais vinculados a Hospital (ou vazios)
    const existingHospitalCats = app.findRecordsByFilter(
      'categorias_vistoria',
      "tipo = 'Hospital' || tipo = ''",
      'ordem,created',
      500,
      0,
    )

    // Verificar se já temos exatamente a estrutura de 16 itens cadastrada para Hospital
    const hasNewStructure =
      existingHospitalCats.length === 16 &&
      existingHospitalCats.some((c) =>
        c.get('nome').includes('Ar-condicionado, Sistemas de Refrigeração'),
      )

    if (hasNewStructure) {
      console.log('Nova estrutura de Hospital já aplicada, pulando inserção.')
      return
    }

    const oldCatIds = existingHospitalCats.map((c) => c.id)

    // 3. Tratar respostas de vistorias existentes que apontavam para as categorias/subitens antigos de Hospital
    // Para que nenhuma vistoria seja quebrada por chaves estrangeiras ou referências órfãs:
    // Removemos os registros em vistoria_itens que pertenciam aos subitens/categorias antigos do Hospital.
    if (oldCatIds.length > 0) {
      for (let i = 0; i < oldCatIds.length; i++) {
        const catId = oldCatIds[i]
        app
          .db()
          .newQuery('DELETE FROM vistoria_itens WHERE categoria = {:catId}')
          .bind({ catId: catId })
          .execute()
      }
    }

    // 4. Remover subitens antigos de Hospital
    const existingHospitalSubitens = app.findRecordsByFilter(
      'subitens_checklist',
      "tipo = 'Hospital' || tipo = ''",
      'ordem,created',
      1000,
      0,
    )

    for (let i = 0; i < existingHospitalSubitens.length; i++) {
      try {
        app.delete(existingHospitalSubitens[i])
      } catch (e) {
        console.log('Erro ao deletar subitem antigo:', e)
      }
    }

    // Também remover quaisquer subitens cuja categoria estivesse em oldCatIds
    if (oldCatIds.length > 0) {
      for (let i = 0; i < oldCatIds.length; i++) {
        const catId = oldCatIds[i]
        app
          .db()
          .newQuery('DELETE FROM subitens_checklist WHERE categoria = {:catId}')
          .bind({ catId: catId })
          .execute()
      }
    }

    // 5. Remover categorias antigas de Hospital
    for (let i = 0; i < existingHospitalCats.length; i++) {
      try {
        app.delete(existingHospitalCats[i])
      } catch (e) {
        console.log('Erro ao deletar categoria antiga:', e)
      }
    }

    // 6. Criar as 16 novas categorias e seus subitens
    for (let i = 0; i < novaEstruturaHospital.length; i++) {
      const itemPrincipal = novaEstruturaHospital[i]

      // Criar Record em categorias_vistoria
      const catRecord = new Record(catCol)
      catRecord.set('nome', itemPrincipal.nome)
      catRecord.set('tipo', 'Hospital')
      catRecord.set('ordem', itemPrincipal.ordem)
      catRecord.set('exigeArt', false)
      catRecord.set('periodicidadeDias', null)
      app.save(catRecord)

      // Criar Subitens para esta categoria
      for (let j = 0; j < itemPrincipal.subitens.length; j++) {
        const subData = itemPrincipal.subitens[j]
        const subRecord = new Record(subCol)
        subRecord.set('categoria', catRecord.id)
        subRecord.set('tipo', 'Hospital')
        subRecord.set('ordem', j + 1)
        subRecord.set('codigo', subData.codigo)
        subRecord.set('descricao', subData.descricao)
        subRecord.set('exigeArt', false)
        subRecord.set('periodicidadeDias', null)
        app.save(subRecord)
      }
    }

    console.log('Estrutura de 16 categorias e subitens de Hospital criada com sucesso!')
  },
  (app) => {
    // Reversão opcional (não destrutiva)
    try {
      const hospitalCats = app.findRecordsByFilter(
        'categorias_vistoria',
        "tipo = 'Hospital'",
        'ordem',
        500,
        0,
      )
      for (let i = 0; i < hospitalCats.length; i++) {
        app.delete(hospitalCats[i])
      }
    } catch (_) {}
  },
)
