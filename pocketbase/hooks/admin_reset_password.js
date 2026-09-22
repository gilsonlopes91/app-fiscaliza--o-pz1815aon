// Endpoint customizado para redefinição administrativa de senha de usuários
// Apenas administradores podem acionar esta rota.
// Gera ou aplica senha provisória e marca must_change_password = true.

routerAdd(
  'POST',
  '/backend/v1/users/reset-password',
  (e) => {
    // 1. Verificar autenticação e permissão de administrador
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { message: 'Não autenticado.' })
    }

    const role = authRecord.get('role')
    if (role !== 'admin') {
      return e.json(403, { message: 'Apenas administradores podem redefinir senhas.' })
    }

    // 2. Ler parâmetros do body
    const body = e.requestInfo().body || {}
    const userId = body.userId

    if (!userId || typeof userId !== 'string') {
      return e.json(400, { message: 'userId é obrigatório.' })
    }

    // 3. Impedir auto-reset do administrador para evitar bloqueio acidental
    if (userId === authRecord.id) {
      return e.json(400, {
        message: 'Você não pode redefinir a própria senha através desta função administrativa.',
      })
    }

    // 4. Localizar usuário alvo
    let targetUser
    try {
      targetUser = $app.findFirstRecordByData('_pb_users_auth_', 'id', userId)
    } catch (err) {
      return e.json(404, { message: 'Usuário não encontrado.' })
    }

    // 5. Obter ou gerar a senha provisória
    let provisionalPassword = body.provisionalPassword
    if (
      !provisionalPassword ||
      typeof provisionalPassword !== 'string' ||
      provisionalPassword.length < 8
    ) {
      // Gerar senha provisória aleatória segura de 10 caracteres
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*'
      const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
      const lowers = 'abcdefghijkmnpqrstuvwxyz'
      const digits = '23456789'
      const symbols = '!@#$%&*'

      let pass = ''
      pass += uppers.charAt(Math.floor(Math.random() * uppers.length))
      pass += lowers.charAt(Math.floor(Math.random() * lowers.length))
      pass += digits.charAt(Math.floor(Math.random() * digits.length))
      pass += symbols.charAt(Math.floor(Math.random() * symbols.length))

      for (let i = 4; i < 10; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length))
      }

      // Embaralha caracteres
      const arr = pass.split('')
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = arr[i]
        arr[i] = arr[j]
        arr[j] = temp
      }
      provisionalPassword = arr.join('')
    }

    // 6. Atualizar a senha do usuário e setar must_change_password
    try {
      targetUser.setPassword(provisionalPassword)
      targetUser.set('must_change_password', true)
      $app.save(targetUser)
    } catch (err) {
      return e.json(500, {
        message: 'Erro ao salvar a nova senha do usuário: ' + (err.message || String(err)),
      })
    }

    // 7. Retornar resposta de sucesso
    return e.json(200, {
      success: true,
      provisionalPassword: provisionalPassword,
      user: {
        id: targetUser.id,
        email: targetUser.email(),
        name: targetUser.get('name') || '',
        role: targetUser.get('role') || 'usuario',
        approved: Boolean(targetUser.get('approved')),
        approvalStatus: targetUser.get('approvalStatus') || 'aprovado',
        must_change_password: true,
        created: targetUser.getString('created'),
        updated: targetUser.getString('updated'),
      },
    })
  },
  $apis.requireAuth(),
)
