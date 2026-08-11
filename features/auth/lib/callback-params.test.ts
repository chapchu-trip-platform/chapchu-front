import { describe, expect, it } from 'vitest'
import {
  readAccessTokenFromHash,
  readRegistrationToken,
} from '@/features/auth/lib/callback-params'

describe('OAuth callback parameter parsing', () => {
  it('reads one access token from a URL fragment', () => {
    expect(readAccessTokenFromHash('#access_token=header.payload.signature')).toEqual({
      ok: true,
      token: 'header.payload.signature',
    })
  })

  it('rejects missing or duplicate access tokens', () => {
    expect(readAccessTokenFromHash('')).toEqual({ ok: false, reason: 'missing' })
    expect(readAccessTokenFromHash('#access_token=one&access_token=two')).toEqual({
      ok: false,
      reason: 'duplicate',
    })
    expect(readAccessTokenFromHash('#access_token=one&access_token=')).toEqual({
      ok: false,
      reason: 'duplicate',
    })
  })

  it('reads the documented registration token query parameter', () => {
    expect(readRegistrationToken('?registration_token=short-lived-token')).toEqual({
      ok: true,
      token: 'short-lived-token',
    })
  })

  it('rejects oversized access tokens', () => {
    expect(readAccessTokenFromHash(`#access_token=${'x'.repeat(8_193)}`)).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })

  it('rejects blank or duplicate registration token parameters', () => {
    expect(readRegistrationToken('?registration_token=')).toEqual({
      ok: false,
      reason: 'missing',
    })
    expect(
      readRegistrationToken('?registration_token=valid&registration_token=')
    ).toEqual({ ok: false, reason: 'duplicate' })
  })
})
