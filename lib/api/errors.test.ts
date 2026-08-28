import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { normalizeApiError } from '@/lib/api/errors'

function createAxiosError(status?: number, data?: unknown, code?: string) {
  const config = { headers: {} } as InternalAxiosRequestConfig
  const response = status
    ? ({
        data,
        status,
        statusText: String(status),
        headers: {},
        config,
      } satisfies AxiosResponse)
    : undefined

  return new AxiosError('Request failed', code, config, undefined, response)
}

describe('normalizeApiError', () => {
  it('normalizes non-Axios errors as unknown', () => {
    const error = normalizeApiError(new Error('boom'))

    expect(error).toMatchObject({
      type: 'unknown',
      message: 'Unexpected error occurred.',
    })
  })

  it('normalizes timeout errors', () => {
    const error = normalizeApiError(createAxiosError(undefined, undefined, 'ECONNABORTED'))

    expect(error).toMatchObject({
      type: 'timeout',
      message: 'The request timed out.',
    })
  })

  it('normalizes network errors without response', () => {
    const error = normalizeApiError(createAxiosError())

    expect(error).toMatchObject({
      type: 'network',
      message: 'Network connection failed.',
    })
  })

  it('normalizes validation errors with backend details', () => {
    const error = normalizeApiError(
      createAxiosError(422, {
        message: 'Invalid pet name',
        details: { field: 'name' },
      })
    )

    expect(error).toMatchObject({
      type: 'validation',
      status: 422,
      message: 'Invalid pet name',
      details: { field: 'name' },
    })
  })

  it('normalizes auth and server status codes', () => {
    expect(normalizeApiError(createAxiosError(401))).toMatchObject({
      type: 'unauthorized',
      status: 401,
    })
    expect(normalizeApiError(createAxiosError(403))).toMatchObject({
      type: 'forbidden',
      status: 403,
    })
    expect(normalizeApiError(createAxiosError(404))).toMatchObject({
      type: 'not-found',
      status: 404,
    })
    expect(normalizeApiError(createAxiosError(500))).toMatchObject({
      type: 'server',
      status: 500,
    })
  })
})
