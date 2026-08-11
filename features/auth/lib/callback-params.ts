export type TokenParamResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'missing' | 'duplicate' | 'invalid' }

const MAX_TOKEN_LENGTH = 8_192

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
