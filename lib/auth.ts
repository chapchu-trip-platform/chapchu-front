/**
 * chapchu-auth 로그인 연동.
 *
 * Authorization Code + PKCE 흐름이다. chapchu-front는 client secret이 없는 public client라
 * PKCE가 필수다. 자세한 명세는 https://auth.chapchu.site/docs/index.html 참고.
 *
 *   ① beginLogin()      브라우저를 /oauth2/authorize로 이동 (fetch 아님, 전체 페이지 이동)
 *   ② 구글 로그인        미등록 계정이면 이 시점에 자동으로 회원등록된다
 *   ③ completeLogin()   콜백으로 받은 code를 access token으로 교환
 *   ④ apiFetch()        이후 API 호출에 Authorization 헤더 부착
 */

const AUTH_BASE_URL = process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? 'https://auth.chapchu.site'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.chapchu.site'

const CLIENT_ID = 'chapchu-front'
const CALLBACK_PATH = '/login/callback'
const SCOPE = 'openid profile email'

const VERIFIER_KEY = 'chapchu.pkce.verifier'
const STATE_KEY = 'chapchu.oauth.state'
const TOKEN_KEY = 'chapchu.access.token'

export class SessionExpiredError extends Error {
  constructor() {
    super('세션이 만료되었습니다. 다시 로그인해주세요.')
    this.name = 'SessionExpiredError'
  }
}

export class LoginFailedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LoginFailedError'
  }
}

export interface Me {
  id: string
  email: string
  nickname: string | null
  role: string
  accountStatus: string
  createdAt: string
  updatedAt: string
}

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64Url(bytes)
}

async function sha256(text: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return new Uint8Array(digest)
}

/** 서버에 등록된 redirect_uri와 **정확히** 일치해야 한다. 다르면 에러 없이 구글 로그인만 거친 뒤 아무 데도 도달하지 못한다. */
export function callbackUrl(): string {
  return new URL(CALLBACK_PATH, window.location.origin).toString()
}

/** 로그인 시작. 현재 탭을 인증 서버로 이동시키므로 이 함수는 반환되지 않는다. */
export async function beginLogin(): Promise<void> {
  const verifier = randomToken()
  const state = randomToken(16)

  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)

  const url = new URL('/oauth2/authorize', AUTH_BASE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('redirect_uri', callbackUrl())
  url.searchParams.set('scope', SCOPE)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', base64Url(await sha256(verifier)))
  url.searchParams.set('code_challenge_method', 'S256')

  window.location.assign(url.toString())
}

/** 콜백 쿼리스트링을 받아 토큰 교환까지 마친다. 성공하면 access token을 저장하고 반환한다. */
export async function completeLogin(query: URLSearchParams): Promise<string> {
  const error = query.get('error')
  if (error) {
    throw new LoginFailedError(query.get('error_description') ?? error)
  }

  const code = query.get('code')
  if (!code) {
    throw new LoginFailedError('인가 코드가 없습니다.')
  }

  const expectedState = sessionStorage.getItem(STATE_KEY)
  if (!expectedState || query.get('state') !== expectedState) {
    throw new LoginFailedError('state 값이 일치하지 않습니다. 로그인을 다시 시도해주세요.')
  }

  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  if (!verifier) {
    throw new LoginFailedError('PKCE 검증값이 없습니다. 로그인을 다시 시도해주세요.')
  }

  const response = await fetch(new URL('/oauth2/token', AUTH_BASE_URL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl(),
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  })

  sessionStorage.removeItem(VERIFIER_KEY)
  sessionStorage.removeItem(STATE_KEY)

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new LoginFailedError(body?.error_description ?? body?.error ?? '토큰 발급에 실패했습니다.')
  }

  const token = (await response.json()).access_token as string
  sessionStorage.setItem(TOKEN_KEY, token)
  return token
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(TOKEN_KEY)
}

export function logout(): void {
  sessionStorage.removeItem(TOKEN_KEY)
}

/**
 * chapchu-api 호출. 토큰이 없거나 만료되면 {@link SessionExpiredError}를 던진다.
 *
 * 현재 인증 서버는 refresh token을 발급하지 않는다(chapchu-auth 이슈 #9). access token 유효기간이
 * 30분이므로 만료되면 {@link beginLogin}부터 다시 시작해야 한다.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAccessToken()
  if (!token) throw new SessionExpiredError()

  const response = await fetch(new URL(path, API_BASE_URL), {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  })

  if (response.status === 401) {
    logout()
    throw new SessionExpiredError()
  }
  return response
}

async function readJson<T>(response: Response, action: string): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? `${action} 실패 (HTTP ${response.status})`)
  }
  return response.json() as Promise<T>
}

export async function fetchMe(): Promise<Me> {
  return readJson<Me>(await apiFetch('/users/me'), '내 정보 조회')
}

/** 자동 회원등록 직후에는 nickname이 비어 있다. 이때 닉네임 등록 화면으로 보내야 한다. */
export function needsOnboarding(me: Me): boolean {
  return me.nickname === null || me.nickname.trim() === ''
}

export async function isNicknameAvailable(nickname: string): Promise<boolean> {
  const response = await apiFetch(
    `/users/nickname/availability?nickname=${encodeURIComponent(nickname)}`,
  )
  const body = await readJson<{ available: boolean }>(response, '닉네임 중복 확인')
  return body.available
}

export async function registerNickname(nickname: string): Promise<Me> {
  const response = await apiFetch('/users/me', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  })
  return readJson<Me>(response, '닉네임 등록')
}
