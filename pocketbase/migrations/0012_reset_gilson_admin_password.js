migrate(
  (app) => {
    // 0012_reset_gilson_admin_password.js
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const passwordField = users.fields.getByName('password')
    if (passwordField) {
      passwordField.min = 6
      app.save(users)
    }

    let user = app.findFirstRecordByData('_pb_users_auth_', 'id', '9d79w7s8tobmghd')
    user.setPassword('Skip@2026')
    app.save(user)
  },
  (app) => {
    // Revert logic
  },
)
