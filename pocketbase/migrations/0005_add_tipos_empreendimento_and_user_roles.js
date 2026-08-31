migrate(
  (app) => {
    // 1. Update users collection to add role, approved, and status fields
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'usuario'],
          maxSelect: 1,
        }),
      )
    }

    if (!users.fields.getByName('approved')) {
      users.fields.add(
        new BoolField({
          name: 'approved',
        }),
      )
    }

    if (!users.fields.getByName('approvalStatus')) {
      users.fields.add(
        new SelectField({
          name: 'approvalStatus',
          values: ['pendente', 'aprovado', 'rejeitado'],
          maxSelect: 1,
        }),
      )
    }

    // Ensure access rules allow authenticated users to view/manage as appropriate
    users.listRule = ''
    users.viewRule = ''
    users.createRule = ''
    users.updateRule = ''
    users.deleteRule = ''

    app.save(users)

    // 2. Create tipos_empreendimento collection
    let tiposCollection
    try {
      tiposCollection = app.findCollectionByNameOrId('tipos_empreendimento')
    } catch (_) {
      tiposCollection = new Collection({
        name: 'tipos_empreendimento',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'icone', type: 'text' },
          { name: 'descricao', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_tipos_empreendimento_nome ON tipos_empreendimento (nome)',
        ],
      })
      app.save(tiposCollection)
    }

    // 3. Seed initial tipos_empreendimento (Hospital is the standard one, plus Clinica, Laboratorio, Posto de Saude, etc.)
    const defaultTipos = [
      {
        nome: 'Hospital',
        icone: 'Building2',
        descricao: 'Unidades hospitalares gerais e especializadas de média e alta complexidade',
      },
      {
        nome: 'Clínica Médica',
        icone: 'Stethoscope',
        descricao: 'Clínicas médicas, odontológicas e centros de consultas ambulatoriais',
      },
      {
        nome: 'Laboratório de Análises',
        icone: 'FlaskConical',
        descricao: 'Laboratórios de análises clínicas, patologia e diagnóstico laboratorial',
      },
      {
        nome: 'Centro de Diagnóstico por Imagem',
        icone: 'Scan',
        descricao: 'Unidades de radiologia, tomografia, ressonância e ultrassonografia',
      },
      {
        nome: 'Unidade Básica de Saúde (UBS)',
        icone: 'HeartPulse',
        descricao: 'Postos de saúde da família e unidades de atenção básica municipal',
      },
      {
        nome: 'Pronto Atendimento / UPA',
        icone: 'Activity',
        descricao: 'Unidades de pronto atendimento de urgência e emergência 24h',
      },
    ]

    for (let i = 0; i < defaultTipos.length; i++) {
      const item = defaultTipos[i]
      try {
        app.findFirstRecordByData('tipos_empreendimento', 'nome', item.nome)
      } catch (_) {
        const record = new Record(tiposCollection)
        record.set('nome', item.nome)
        record.set('icone', item.icone)
        record.set('descricao', item.descricao)
        app.save(record)
      }
    }

    // 4. Seed default Admin user (gilsonlopes2991@gmail.com and admin@creapi.org.br)
    const seedUsers = [
      {
        email: 'gilsonlopes2991@gmail.com',
        name: 'Gilson Lopes (Admin)',
        role: 'admin',
        approved: true,
        approvalStatus: 'aprovado',
      },
      {
        email: 'admin@creapi.org.br',
        name: 'Administrador Fiscalização',
        role: 'admin',
        approved: true,
        approvalStatus: 'aprovado',
      },
      {
        email: 'fiscal@creapi.org.br',
        name: 'Fiscal de Engenharia',
        role: 'usuario',
        approved: true,
        approvalStatus: 'aprovado',
      },
      {
        email: 'pendente@creapi.org.br',
        name: 'Engenheiro Solicitante',
        role: 'usuario',
        approved: false,
        approvalStatus: 'pendente',
      },
    ]

    for (let i = 0; i < seedUsers.length; i++) {
      const u = seedUsers[i]
      try {
        const existingUser = app.findAuthRecordByEmail('_pb_users_auth_', u.email)
        existingUser.set('name', u.name)
        existingUser.set('role', u.role)
        existingUser.set('approved', u.approved)
        existingUser.set('approvalStatus', u.approvalStatus)
        existingUser.setVerified(true)
        app.save(existingUser)
      } catch (_) {
        const userRecord = new Record(users)
        userRecord.setEmail(u.email)
        userRecord.setPassword('Skip@Pass')
        userRecord.setVerified(true)
        userRecord.set('name', u.name)
        userRecord.set('role', u.role)
        userRecord.set('approved', u.approved)
        userRecord.set('approvalStatus', u.approvalStatus)
        app.save(userRecord)
      }
    }
  },
  (app) => {
    try {
      const tiposCollection = app.findCollectionByNameOrId('tipos_empreendimento')
      app.delete(tiposCollection)
    } catch (_) {}
  },
)
