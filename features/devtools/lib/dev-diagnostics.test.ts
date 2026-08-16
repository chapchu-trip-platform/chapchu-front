import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  announceDiagnosticViewer,
  publishDiagnosticEvent,
  releaseDiagnosticViewer,
  sanitizeDiagnosticValue,
  subscribeToDiagnosticEvents,
} from '@/features/devtools/lib/dev-diagnostics'

afterEach(() => {
  releaseDiagnosticViewer()
  vi.restoreAllMocks()
})

describe('development diagnostics redaction', () => {
  it('redacts authentication credentials while preserving useful payload data', () => {
    expect(
      sanitizeDiagnosticValue({
        registrationToken: 'registration-secret',
        user: {
          nickname: '햇살여행자',
          regionIds: ['region-seoul'],
        },
        headers: {
          Authorization: 'Bearer access-secret',
          Cookie: 'refresh_token=refresh-secret',
        },
        callback:
          'http://localhost:3000/auth/callback?registration_token=query-secret',
      })
    ).toEqual({
      registrationToken: '[REDACTED]',
      user: {
        nickname: '햇살여행자',
        regionIds: ['region-seoul'],
      },
      headers: {
        Authorization: '[REDACTED]',
        Cookie: '[REDACTED]',
      },
      callback:
        'http://localhost:3000/auth/callback?registration_token=[REDACTED]',
    })
  })

  it('handles circular values without breaking the inspected request', () => {
    const value: Record<string, unknown> = { status: 'pending' }
    value.self = value

    expect(sanitizeDiagnosticValue(value)).toEqual({
      status: 'pending',
      self: '[CIRCULAR]',
    })
  })

  it.each([
    'clientSecret',
    'newPassword',
    'passwordConfirmation',
    'credentialId',
    'idToken',
    'apiKey',
    'privateKey',
    'csrfValue',
  ])('redacts the common sensitive key %s', (key) => {
    expect(sanitizeDiagnosticValue({ [key]: 'secret' })).toEqual({
      [key]: '[REDACTED]',
    })
  })

  it('redacts serialized JSON and URL-encoded credential bodies', () => {
    expect(
      sanitizeDiagnosticValue(
        JSON.stringify({
          registrationToken: 'json-secret',
          nickname: '햇살여행자',
        })
      )
    ).toEqual({
      registrationToken: '[REDACTED]',
      nickname: '햇살여행자',
    })
    expect(
      sanitizeDiagnosticValue(
        'clientSecret=form-secret&nickname=%ED%96%87%EC%82%B4'
      )
    ).toBe('clientSecret=[REDACTED]&nickname=%ED%96%87%EC%82%B4')
  })

  it('sanitizes summaries before publishing them to listeners', () => {
    vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const listener = vi.fn()
    const unsubscribe = subscribeToDiagnosticEvents(listener)
    announceDiagnosticViewer()

    publishDiagnosticEvent({
      kind: 'network',
      summary: 'REQUEST GET /callback?access_token=summary-secret',
      details: {},
    })

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'REQUEST GET /callback?access_token=[REDACTED]',
      })
    )
    unsubscribe()
  })
})
