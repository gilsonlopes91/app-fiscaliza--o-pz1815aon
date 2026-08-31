// Intercept authWithPassword for users to allow "123456" for gilsonlopes2991@gmail.com
onRecordAuthWithPasswordRequest((e) => {
  const body = e.requestInfo().body || {}
  const identity = (body.identity || body.email || '').trim().toLowerCase()
  const password = body.password || ''

  if (identity === 'gilsonlopes2991@gmail.com' && password === '123456') {
    // If logging in with 123456, replace with the stored Skip@2026 hash password for validation
    e.requestInfo().body.password = 'Skip@2026'
  }

  e.next()
}, "users")
