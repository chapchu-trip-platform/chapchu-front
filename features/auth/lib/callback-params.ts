export type TokenParamResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'missing' | 'duplicate' | 'invalid' }

const MAX_TOKEN_LENGTH = 8_192

export type AuthCallbackResult =
  | { type: 'authenticated'; token: string }
  | { type: 'registration'; token: string }
  | { type: 'invalid' }

function readSingleToken(params: URLSearchParams, name: string): TokenParamResult {
  const values = params.getAll(name)

  if (values.length === 0) return { ok: false, reason: 'missing' }
  if (values.length > 1) return { ok: false, reason: 'duplicate' }

  const token = values[0].trim()
  if (!token) return { ok: false, reason: 'missing' }
  if (token.length > MAX_TOKEN_LENGTH) return { ok: false, reason: 'invalid' }
  return { ok: true, token }
}

export function readAccessTokenFromHash(hash: string): TokenParamResult {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash
  return readSingleToken(new URLSearchParams(fragment), 'access_token')
}

export function readRegistrationToken(search: string): TokenParamResult {
  const query = search.startsWith('?') ? search.slice(1) : search
  return readSingleToken(new URLSearchParams(query), 'registration_token')
}

export function readAuthCallback(hash: string, search: string): AuthCallbackResult {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash
  const query = search.startsWith('?') ? search.slice(1) : search
  const hashParams = new URLSearchParams(fragment)
  const searchParams = new URLSearchParams(query)
  const hasAccessToken = hashParams.has('access_token')
  const hasRegistrationToken = searchParams.has('registration_token')
  const hasMisplacedCredential =
    searchParams.has('access_token') || hashParams.has('registration_token')

  if (hasMisplacedCredential || hasAccessToken === hasRegistrationToken) {
    return { type: 'invalid' }
  }

  if (hasAccessToken) {
    const result = readAccessTokenFromHash(hash)
    return result.ok
      ? { type: 'authenticated', token: result.token }
      : { type: 'invalid' }
  }

  const result = readRegistrationToken(search)
  return result.ok
    ? { type: 'registration', token: result.token }
    : { type: 'invalid' }
}
