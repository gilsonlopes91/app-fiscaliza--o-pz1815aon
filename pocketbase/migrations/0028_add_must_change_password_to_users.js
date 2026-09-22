migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('must_change_password')) {
      users.fields.add(
        new BoolField({
          name: 'must_change_password',
          required: false,
        }),
      )
    }

    app.save(users)
  },
  (app) => {
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      const field = users.fields.getByName('must_change_password')
      if (field) {
        users.fields.removeByName('must_change_password')
        app.save(users)
      }
    } catch (_) {}
  },
)
