migrate(
  (app) => {
    // 0007_set_admin_user_credentials.js
    // Set admin user gilsonlopes2991@gmail.com
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Find if user already exists
    let user
    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', 'gilsonlopes2991@gmail.com')
    } catch (_) {
      user = new Record(users)
      user.setEmail('gilsonlopes2991@gmail.com')
    }

    user.setVerified(true)
    user.set('name', 'Gilson Lopes')
    user.set('role', 'admin')
    user.set('approved', true)
    user.set('approvalStatus', 'aprovado')
    user.setPassword('Skip@2026')
    app.save(user)
  },
  (app) => {
    // Revert logic
  },
)
