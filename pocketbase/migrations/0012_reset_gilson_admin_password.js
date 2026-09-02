migrate(
  (app) => {
    // 0012_reset_gilson_admin_password.js
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const passwordField = users.fields.getByName('password')
    if (passwordField) {
      passwordField.min = 6
      app.save(users)
    }

    let user
    try {
      user = app.findFirstRecordByData('_pb_users_auth_', 'id', '9d79w7s8tobmghd')
    } catch (_) {
      try {
        user = app.findAuthRecordByEmail('_pb_users_auth_', 'gilsonlopes2991@gmail.com')
      } catch (err) {
        // Fallback if not found
      }
    }

    if (user) {
      user.setPassword('Skip@2026')
      app.save(user)
    }
  },
  (app) => {
    // Revert logic
  },
)
