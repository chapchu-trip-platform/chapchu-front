import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  announceDiagnosticViewer,
  publishDiagnosticEvent,
  recordApiError,
  recordApiRequest,
  recordApiResponse,
  releaseDiagnosticViewer,
  sanitizeDiagnosticValue,
  subscribeToDiagnosticEvents,
} from '@/features/devtools/lib/dev-diagnostics'
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

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

  it('redacts location fields and nearby-place query coordinates', () => {
    expect(
      sanitizeDiagnosticValue({
        lat: 35.858,
        lng: 128.63,
        radiusMeters: 3000,
        nested: {
          position: {
            latitude: 35.858,
            longitude: 128.63,
            accuracyMeters: 420,
          },
        },
      })
    ).toEqual({
      lat: '[REDACTED]',
      lng: '[REDACTED]',
      radiusMeters: 3000,
      nested: {
        position: '[REDACTED]',
      },
    })

    expect(
      sanitizeDiagnosticValue(
        'https://api.chapchu.site/places/nearby?lat=35.858&lng=128.63&radiusMeters=3000'
      )
    ).toBe(
      'https://api.chapchu.site/places/nearby?lat=[REDACTED]&lng=[REDACTED]&radiusMeters=3000'
    )
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

  it('removes location coordinates across API request, response, and error diagnostics', () => {
    const consoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const listener = vi.fn()
    const unsubscribe = subscribeToDiagnosticEvents(listener)
    announceDiagnosticViewer()

    const config = {
      baseURL: 'https://api.chapchu.site',
      url: '/places/nearby?lat=35.858123&lng=128.630456',
      method: 'get',
      headers: {},
      params: { lat: 35.858123, lng: 128.630456, radiusMeters: 3000 },
      data: JSON.stringify({
        position: { latitude: 35.858123, longitude: 128.630456 },
      }),
    } as InternalAxiosRequestConfig

    recordApiRequest('test', config)
    recordApiResponse('test', {
      config,
      data: { latitude: 35.858123, longitude: 128.630456 },
      headers: {},
      status: 200,
      statusText: 'OK',
    } as AxiosResponse)
    recordApiError('test', {
      config,
      message: 'nearby failed',
      response: {
        config,
        data: { location: '35.858123,128.630456' },
        headers: {},
        status: 500,
        statusText: 'Server Error',
      },
    } as AxiosError)

    const emittedText = JSON.stringify({
      listenerCalls: listener.mock.calls,
      consoleCalls: consoleDebug.mock.calls,
    })
    expect(emittedText).not.toContain('35.858123')
    expect(emittedText).not.toContain('128.630456')
    expect(emittedText).toContain('radiusMeters')
    expect(listener).toHaveBeenCalledTimes(3)

    unsubscribe()
  })
})
