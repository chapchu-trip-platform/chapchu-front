import axios, { type AxiosError } from 'axios'

export type ApiErrorType =
  | 'network'
  | 'timeout'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'server'
  | 'unknown'

export interface NormalizedApiError {
  type: ApiErrorType
  status?: number
  message: string
  details?: unknown
}

interface ApiErrorBody {
  message?: string
  error?: string
  details?: unknown
}

function getResponseMessage(error: AxiosError<ApiErrorBody>, fallback: string) {
  return error.response?.data?.message ?? error.response?.data?.error ?? fallback
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return {
      type: 'unknown',
      message: 'Unexpected error occurred.',
      details: error,
    }
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return {
      type: 'timeout',
      message: 'The request timed out.',
      details: error.cause,
    }
  }

  if (!error.response) {
    return {
      type: 'network',
      message: 'Network connection failed.',
      details: error.cause,
    }
  }

  const status = error.response.status

  if (status === 400 || status === 422) {
    return {
      type: 'validation',
      status,
      message: getResponseMessage(error, 'The request is invalid.'),
      details: error.response.data?.details,
    }
  }

  if (status === 401) {
    return {
      type: 'unauthorized',
      status,
      message: getResponseMessage(error, 'Authentication is required.'),
    }
  }

  if (status === 403) {
    return {
      type: 'forbidden',
      status,
      message: getResponseMessage(error, 'You do not have permission.'),
    }
  }

  if (status === 404) {
    return {
      type: 'not-found',
      status,
      message: getResponseMessage(error, 'The requested resource was not found.'),
    }
  }

  if (status >= 500) {
    return {
      type: 'server',
      status,
      message: getResponseMessage(error, 'The server failed to process the request.'),
    }
  }

  return {
    type: 'unknown',
    status,
    message: getResponseMessage(error, 'Unexpected API error occurred.'),
    details: error.response.data,
  }
}
