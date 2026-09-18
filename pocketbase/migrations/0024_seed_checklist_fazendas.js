migrate(
  (app) => {
    // Checklist do "Relatório de Visita ao Produtor Rural - Atividades Técnicas"
    // (Anexos I e II) do CREA-PI, organizado em 2 níveis: tema -> atividade.
    const TIPO = 'Fazendas'

    // [tema, codigo, descricao, periodicidadeDias (0 = sem prazo fixo)]
    const LINHAS = [
      [
        '1. Produção Vegetal e Assistência Técnica',
        '1.1',
        'Assistência técnica às culturas: soja, milho, feijão, algodão, arroz, tabaco, citros, fenação, sorgo, milheto, frutícolas, olerícolas, trigo e outras',
        365,
      ],
      [
        '1. Produção Vegetal e Assistência Técnica',
        '1.2',
        'Mudas, sementes e sementes salvas — produção técnica especializada (ART de produção é anual)',
        365,
      ],
      [
        '1. Produção Vegetal e Assistência Técnica',
        '1.3',
        'CFO/CFOC — Certificado Fitossanitário de Origem e Consolidado (comprovar com laudo do CFO/CFOC + ART)',
        365,
      ],
      [
        '2. Produção Animal',
        '2.1',
        'Projeto de manejo e assistência técnica à criação animal: avicultura, piscicultura, suinocultura, ovinocultura, caprinocultura de leite e corte, bovinocultura de leite e corte, equideocultura, bubalinocultura e estrutiocultura',
        365,
      ],
      [
        '3. Agrotóxicos, Fertilizantes e Corretivos',
        '3.1',
        'Aplicação terrestre de agrotóxicos, fertilizantes e corretivos — execução de serviço técnico',
        365,
      ],
      [
        '3. Agrotóxicos, Fertilizantes e Corretivos',
        '3.2',
        'Aplicação aérea de agrotóxicos ou plantio aéreo (se terceirizada, exigir a ART por aplicação da empresa aplicadora + boletins de aplicação e de voo)',
        0,
      ],
      [
        '3. Agrotóxicos, Fertilizantes e Corretivos',
        '3.3',
        'Receituários agronômicos (comprovar com receitas, ARTs e notas fiscais de compra/venda de agrotóxicos)',
        0,
      ],
      [
        '3. Agrotóxicos, Fertilizantes e Corretivos',
        '3.4',
        'Controle de estoque e armazenamento de agrotóxicos (comprovar com relatório semestral assinado e ART do responsável técnico)',
        180,
      ],
      [
        '4. Armazenagem e Pós-Colheita',
        '4.1',
        'Armazenamento de grãos a granel ou em sacos, em silo vertical ou horizontal, metálico ou de concreto (ART anual de estocagem; armazenadora pessoa jurídica precisa de registro no CREA)',
        365,
      ],
      [
        '5. Irrigação, Água e Energia',
        '5.1',
        'Sistema de irrigação (pivô e outros) — projeto, execução, instalação e manutenção',
        365,
      ],
      [
        '5. Irrigação, Água e Energia',
        '5.2',
        'Monitoramento do uso da água — execução de serviço técnico',
        365,
      ],
      [
        '5. Irrigação, Água e Energia',
        '5.3',
        'Monitoramento da eficiência energética — execução de serviço técnico',
        365,
      ],
      [
        '5. Irrigação, Água e Energia',
        '5.4',
        "Outorga d'água e licença ambiental — solicitação ou renovação",
        365,
      ],
      [
        '6. Exploração Florestal',
        '6.1',
        'Plano de corte — exploração florestal (volume de madeira, plano de manejo ou colheita, técnicas de silvicultura e medidas de segurança)',
        0,
      ],
      [
        '6. Exploração Florestal',
        '6.2',
        'Colheita e transporte florestal — projeto, execução e assistência técnica',
        0,
      ],
      [
        '6. Exploração Florestal',
        '6.3',
        'Desmatamento e destoca — supressão de vegetação florestal e retirada dos tocos remanescentes',
        0,
      ],
      [
        '7. Solo, Mecanização e Agrometeorologia',
        '7.1',
        'Conservação de solos: curvas de nível, terraços, canais escoadouros, readequação de estradas e demais práticas de uso sustentável',
        365,
      ],
      [
        '7. Solo, Mecanização e Agrometeorologia',
        '7.2',
        'Mecanização agrícola — uso de máquinas e equipamentos em atividades agropecuárias e florestais',
        365,
      ],
      [
        '7. Solo, Mecanização e Agrometeorologia',
        '7.3',
        'Agrometeorologia — projeto, instalação, manutenção e operação do monitoramento meteorológico',
        365,
      ],
      [
        '7. Solo, Mecanização e Agrometeorologia',
        '7.4',
        'Modificação artificial do tempo — aviação com objetivos agrícolas',
        0,
      ],
      [
        '8. Georreferenciamento e Crédito Rural',
        '8.1',
        'Georreferenciamento do imóvel rural — projeto e execução (comprovar com contrato ou ART)',
        0,
      ],
      [
        '8. Georreferenciamento e Crédito Rural',
        '8.2',
        'Crédito rural — custeio e investimento, com projeto elaborado por profissional habilitado',
        365,
      ],
      [
        '9. Infraestrutura Rural',
        '9.1',
        'Construções rurais: armazéns, galpões, viveiros, estufas, pocilgas, currais, aviários, estábulos, fossas sépticas, cercas e aguadas',
        0,
      ],
      [
        '9. Infraestrutura Rural',
        '9.2',
        'Estradas rurais — projeto, execução de obra técnica e manutenção (vias sem pavimentação para veículos, tratores e implementos)',
        365,
      ],
      [
        '9. Infraestrutura Rural',
        '9.3',
        'Moradias rurais — residência em madeira ou alvenaria destinada ao abrigo de pessoas no meio rural',
        0,
      ],
      [
        '10. Meio Ambiente e Resíduos',
        '10.1',
        'Tratamento de efluentes líquidos — projeto, execução e monitoramento',
        365,
      ],
      [
        '10. Meio Ambiente e Resíduos',
        '10.2',
        'Gestão de resíduos em atividade agrossilvipastoril — projeto, execução e monitoramento',
        365,
      ],
      [
        '11. Edificações e Estruturas de Armazenagem',
        '11.1',
        'Silos metálicos, máquina de pré-limpeza, elevador e secador de grãos — projeto, execução, dimensionamento e manutenção (envolve engenharia civil, mecânica, elétrica, geologia e de minas)',
        365,
      ],
      [
        '11. Edificações e Estruturas de Armazenagem',
        '11.2',
        'Edificação e construção — projeto, execução de obra técnica, reforma e manutenção',
        0,
      ],
      [
        '12. Instalações Elétricas e Geração de Energia',
        '12.1',
        'Instalações elétricas em baixa, média e alta tensão e equipamentos: subestação, transformadores e redes',
        365,
      ],
      [
        '12. Instalações Elétricas e Geração de Energia',
        '12.2',
        'SPDA — sistema de proteção contra descargas atmosféricas (para-raios)',
        365,
      ],
      [
        '12. Instalações Elétricas e Geração de Energia',
        '12.3',
        'Grupo gerador de energia elétrica — instalação e manutenção',
        365,
      ],
      [
        '12. Instalações Elétricas e Geração de Energia',
        '12.4',
        'Microgeração de energia solar fotovoltaica on-grid ou off-grid',
        365,
      ],
      [
        '12. Instalações Elétricas e Geração de Energia',
        '12.5',
        'Aquecedor solar — projeto, instalação e manutenção',
        365,
      ],
      [
        '13. Climatização e Refrigeração',
        '13.1',
        'Ar-condicionado central ou split — instalação e manutenção',
        365,
      ],
      ['13. Climatização e Refrigeração', '13.2', 'Câmara fria — instalação e manutenção', 365],
      [
        '14. Instalações Mecânicas e Equipamentos',
        '14.1',
        'Caldeiras e/ou vasos de pressão — instalação, inspeção e manutenção',
        365,
      ],
      [
        '14. Instalações Mecânicas e Equipamentos',
        '14.2',
        'Equipamentos de transporte e esteiras transportadoras — instalação e manutenção',
        365,
      ],
      [
        '14. Instalações Mecânicas e Equipamentos',
        '14.3',
        'Instalações mecânicas e equipamentos: tanques e bombas de combustível, balança rodoviária e máquinas industriais',
        365,
      ],
      [
        '15. Prevenção e Combate a Incêndio',
        '15.1',
        'Manutenção e recarga de extintores (comprovar com ART, contrato, nota fiscal e ordem de serviço)',
        365,
      ],
      [
        '15. Prevenção e Combate a Incêndio',
        '15.2',
        'PPCI — Programa de Proteção e Combate a Incêndio: projeto, instalação e manutenção',
        365,
      ],
      [
        '15. Prevenção e Combate a Incêndio',
        '15.3',
        'Central de gás e rede de gás — projeto, instalação e manutenção',
        365,
      ],
      [
        '16. Segurança Eletrônica e Controle de Pragas',
        '16.1',
        'CFTV — sistema de circuito fechado de TV: instalação e manutenção',
        365,
      ],
      [
        '16. Segurança Eletrônica e Controle de Pragas',
        '16.2',
        'Controle de pragas e vetores, expurgo e fumigação (dedetização e desratização)',
        180,
      ],
      [
        '17. Segurança e Saúde no Trabalho',
        '17.1',
        'PGSSMATR (NR-31), PPRA (NR-9) e PGRS — elaboração, implantação e/ou revisão (renovação a cada 12 meses)',
        365,
      ],
      [
        '17. Segurança e Saúde no Trabalho',
        '17.2',
        'PCMAT (NR-18) e LTCAT — elaboração, implantação e/ou revisão',
        365,
      ],
    ]

    let categoriasCollection
    let subitensCollection
    try {
      categoriasCollection = app.findCollectionByNameOrId('categorias_vistoria')
      subitensCollection = app.findCollectionByNameOrId('subitens_checklist')
    } catch (err) {
      console.log('Coleções de checklist não encontradas: ' + err)
      return
    }

    // Agrupa mantendo a ordem de aparição
    const ordemTemas = []
    const porTema = {}
    for (let i = 0; i < LINHAS.length; i++) {
      const tema = LINHAS[i][0]
      if (!porTema[tema]) {
        porTema[tema] = []
        ordemTemas.push(tema)
      }
      porTema[tema].push(LINHAS[i])
    }

    let temasCriados = 0
    let subitensCriados = 0

    for (let t = 0; t < ordemTemas.length; t++) {
      const nomeTema = ordemTemas[t]
      let categoria = null

      // Reaproveita o tema se já existir neste tipo (importação manual anterior)
      try {
        categoria = app.findFirstRecordByFilter(
          'categorias_vistoria',
          'tipo = {:tipo} && nome = {:nome}',
          { tipo: TIPO, nome: nomeTema },
        )
      } catch (_) {
        categoria = null
      }

      if (!categoria) {
        categoria = new Record(categoriasCollection)
        categoria.set('nome', nomeTema)
        categoria.set('tipo', TIPO)
        categoria.set('ordem', t + 1)
        categoria.set('exigeArt', false)
        app.save(categoria)
        temasCriados++
      }

      const linhas = porTema[nomeTema]
      for (let s = 0; s < linhas.length; s++) {
        const codigo = linhas[s][1]
        const descricao = linhas[s][2]
        const periodicidade = linhas[s][3]

        // Não duplica subitem já existente na mesma categoria
        let existente = null
        try {
          existente = app.findFirstRecordByFilter(
            'subitens_checklist',
            'categoria = {:categoria} && descricao = {:descricao}',
            { categoria: categoria.id, descricao: descricao },
          )
        } catch (_) {
          existente = null
        }
        if (existente) continue

        const subitem = new Record(subitensCollection)
        subitem.set('categoria', categoria.id)
        subitem.set('tipo', TIPO)
        subitem.set('ordem', s + 1)
        subitem.set('codigo', codigo)
        subitem.set('descricao', descricao)
        subitem.set('exigeArt', true)
        if (periodicidade > 0) {
          subitem.set('periodicidadeDias', periodicidade)
        }
        app.save(subitem)
        subitensCriados++
      }
    }

    console.log(
      'Checklist Fazendas: ' + temasCriados + ' temas e ' + subitensCriados + ' subitens criados.',
    )
  },
  (app) => {
    // Remove apenas o que foi semeado para o tipo Fazendas
    try {
      const subitens = app.findAllRecords('subitens_checklist')
      for (let i = 0; i < subitens.length; i++) {
        if (subitens[i].get('tipo') === 'Fazendas') {
          app.delete(subitens[i])
        }
      }
      const categorias = app.findAllRecords('categorias_vistoria')
      for (let j = 0; j < categorias.length; j++) {
        if (categorias[j].get('tipo') === 'Fazendas') {
          app.delete(categorias[j])
        }
      }
    } catch (_) {}
  },
)
