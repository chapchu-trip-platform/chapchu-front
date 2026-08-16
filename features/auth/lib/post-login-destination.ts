const POST_LOGIN_DESTINATION_KEY = 'chapchu.auth.post-login-destination'

export function clearPostLoginDestination() {
  try {
    sessionStorage.removeItem(POST_LOGIN_DESTINATION_KEY)
  } catch {
    // The value is non-sensitive and fixed; unavailable storage needs no fallback.
  }
}
