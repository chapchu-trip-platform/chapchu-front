const POST_LOGIN_DESTINATION_KEY = 'chapchu.auth.post-login-destination'
const PET_SETUP_DESTINATION = 'pet-setup'

export function rememberPetSetupDestination() {
  try {
    sessionStorage.setItem(POST_LOGIN_DESTINATION_KEY, PET_SETUP_DESTINATION)
  } catch {
    // Login still works when browser storage is unavailable; only the pet continuation is skipped.
  }
}

export function clearPostLoginDestination() {
  try {
    sessionStorage.removeItem(POST_LOGIN_DESTINATION_KEY)
  } catch {
    // The value is non-sensitive and fixed; unavailable storage needs no fallback.
  }
}

export function consumePostLoginDestination(): '/home' | '/setup?step=pet' {
  let destination: string | null = null
  try {
    destination = sessionStorage.getItem(POST_LOGIN_DESTINATION_KEY)
  } catch {
    return '/home'
  }
  clearPostLoginDestination()

  return destination === PET_SETUP_DESTINATION ? '/setup?step=pet' : '/home'
}
