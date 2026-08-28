import type {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'

export type DiagnosticKind = 'network' | 'state' | 'system'

export interface DiagnosticEvent {
  id: string
  kind: DiagnosticKind
  summary: string
  timestamp: string
  source: string
  requestId?: string
  details: unknown
}

type DiagnosticRequestConfig = InternalAxiosRequestConfig & {
  _diagnosticRequestId?: string
  _diagnosticStartedAt?: number
}

const DIAGNOSTIC_EVENT_NAME = 'chapchu:dev-diagnostic'
const DIAGNOSTIC_CHANNEL_NAME = 'chapchu-dev-diagnostics'
const MAX_STRING_LENGTH = 50_000
const MAX_ARRAY_LENGTH = 250
const MAX_OBJECT_KEYS = 150
const VIEWER_TTL_MS = 4_000
const SENSITIVE_KEY_FRAGMENTS = [
  'token',
  'authorization',
  'cookie',
  'password',
  'secret',
  'credential',
  'apikey',
  'privatekey',
  'csrf',
  'xsrf',
]
const SENSITIVE_EXACT_KEYS = new Set([
  'accuracy',
  'accuracymeters',
  'coordinate',
  'coordinates',
  'lat',
  'latitude',
  'lng',
  'location',
  'locationconsent',
  'longitude',
  'position',
])

let eventSequence = 0
let broadcastChannel: BroadcastChannel | null = null
let lastViewerPresenceAt = 0
let isLocalViewer = false
const diagnosticInstanceId = Math.random().toString(36).slice(2, 9)

export function isDevelopmentDiagnosticsEnabled() {
  return process.env.NODE_ENV !== 'production' && typeof window !== 'undefined'
}

function nextId(prefix: string) {
  eventSequence += 1
  return `${prefix}-${diagnosticInstanceId}-${Date.now()}-${eventSequence}`
}

function isSensitiveKey(key: string) {
  const normalizedKey = key.replace(/[^a-z0-9]/gi, '').toLowerCase()
  return SENSITIVE_EXACT_KEYS.has(normalizedKey) || SENSITIVE_KEY_FRAGMENTS.some((fragment) =>
    normalizedKey.includes(fragment)
  )
}

function redactString(value: string, seen: WeakSet<object>, depth: number) {
  const trimmedValue = value.trim()
  if (
    (trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) ||
    (trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))
  ) {
    try {
      return sanitizeDiagnosticValue(JSON.parse(trimmedValue), seen, depth + 1)
    } catch {
      // Fall through to best-effort string redaction for malformed JSON.
    }
  }

  const redacted = value
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/Basic\s+[^\s"']+/gi, 'Basic [REDACTED]')
    .replace(
      /(^|[?&#])([^=&#]*(?:token|secret|password|credential|authorization|cookie|api[_-]?key|private[_-]?key|csrf|xsrf)[^=&#]*)=([^&#\s]*)/gi,
      '$1$2=[REDACTED]'
    )
    .replace(
      /(^|[?&#])((?:lat|lng|latitude|longitude|accuracy|accuracyMeters))=([^&#\s]*)/gi,
      '$1$2=[REDACTED]'
    )
    .replace(
      /("(?:[^"\\]|\\.)*(?:token|secret|password|credential|authorization|cookie|api[_-]?key|private[_-]?key|csrf|xsrf)(?:[^"\\]|\\.)*"\s*:\s*)("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null)/gi,
      '$1"[REDACTED]"'
    )
    .replace(
      /("(?:lat|lng|latitude|longitude|accuracy|accuracyMeters|coordinate|coordinates|location|position)"\s*:\s*)("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null)/gi,
      '$1"[REDACTED]"'
    )
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]')

  return redacted.length > MAX_STRING_LENGTH
    ? `${redacted.slice(0, MAX_STRING_LENGTH)}\n[TRUNCATED]`
    : redacted
}

export function sanitizeDiagnosticValue(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0
): unknown {
  if (depth > 8) return '[MAX_DEPTH]'
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return redactString(value, seen, depth)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'function') return '[FUNCTION]'

  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    return '[FORM_DATA]'
  }
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return `[BLOB ${value.type || 'unknown'} ${value.size} bytes]`
  }
  if (value instanceof Date) return value.toISOString()

  if (typeof value !== 'object') return String(value)
  if (seen.has(value)) return '[CIRCULAR]'
  seen.add(value)

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitizeDiagnosticValue(item, seen, depth + 1))
    if (value.length > MAX_ARRAY_LENGTH) items.push('[TRUNCATED]')
    return items
  }

  const serializable = value as Record<string, unknown> & {
    toJSON?: () => unknown
  }
  if (typeof serializable.toJSON === 'function') {
    try {
      const jsonValue = serializable.toJSON()
      if (jsonValue !== value) {
        return sanitizeDiagnosticValue(jsonValue, seen, depth + 1)
      }
    } catch {
      return '[UNSERIALIZABLE]'
    }
  }

  const entries = Object.entries(serializable).slice(0, MAX_OBJECT_KEYS)
  const sanitizedEntries = entries.map(([key, item]) => [
      key,
      isSensitiveKey(key)
        ? '[REDACTED]'
        : sanitizeDiagnosticValue(item, seen, depth + 1),
    ])
  if (Object.keys(serializable).length > MAX_OBJECT_KEYS) {
    sanitizedEntries.push(['[TRUNCATED]', '[TRUNCATED]'])
  }
  return Object.fromEntries(sanitizedEntries)
}

function getBroadcastChannel() {
  if (!isDevelopmentDiagnosticsEnabled() || !('BroadcastChannel' in window)) {
    return null
  }
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel(DIAGNOSTIC_CHANNEL_NAME)
    broadcastChannel.addEventListener('message', (event) => {
      if (event.data?.type === 'viewer-active') {
        lastViewerPresenceAt = Date.now()
      }
      if (event.data?.type === 'viewer-status-request' && isLocalViewer) {
        broadcastChannel?.postMessage({ type: 'viewer-active' })
      }
    })
  }
  return broadcastChannel
}

function hasActiveViewer() {
  return isLocalViewer || Date.now() - lastViewerPresenceAt < VIEWER_TTL_MS
}

export function initializeDiagnosticPublisher() {
  const channel = getBroadcastChannel()
  channel?.postMessage({ type: 'viewer-status-request' })
}

export function announceDiagnosticViewer() {
  if (!isDevelopmentDiagnosticsEnabled()) return
  isLocalViewer = true
  lastViewerPresenceAt = Date.now()
  getBroadcastChannel()?.postMessage({ type: 'viewer-active' })
}

export function releaseDiagnosticViewer() {
  isLocalViewer = false
}

export function supportsCrossTabDiagnostics() {
  return isDevelopmentDiagnosticsEnabled() && 'BroadcastChannel' in window
}

export function publishDiagnosticEvent(
  event: Omit<DiagnosticEvent, 'id' | 'timestamp' | 'source'> & {
    source?: string
  }
) {
  if (!isDevelopmentDiagnosticsEnabled() || !hasActiveViewer()) return

  try {
    const sanitizedSummary = sanitizeDiagnosticValue(event.summary)
    const sanitizedSource = sanitizeDiagnosticValue(
      event.source ?? window.location.pathname
    )
    const diagnosticEvent: DiagnosticEvent = {
      ...event,
      id: nextId(event.kind),
      timestamp: new Date().toISOString(),
      source:
        typeof sanitizedSource === 'string' ? sanitizedSource : '[REDACTED]',
      summary:
        typeof sanitizedSummary === 'string' ? sanitizedSummary : '[REDACTED]',
      details: sanitizeDiagnosticValue(event.details),
    }

    window.dispatchEvent(
      new CustomEvent<DiagnosticEvent>(DIAGNOSTIC_EVENT_NAME, {
        detail: diagnosticEvent,
      })
    )
    getBroadcastChannel()?.postMessage({
      type: 'event',
      event: diagnosticEvent,
    })

    console.debug('[Chapchu Dev]', diagnosticEvent.summary, diagnosticEvent)
  } catch {
    // Diagnostics must never interfere with an application request or state update.
  }
}

function normalizeIncomingEvent(value: unknown): DiagnosticEvent | null {
  try {
    const event = value as Partial<DiagnosticEvent>
    if (
      typeof event.id !== 'string' ||
      !['network', 'state', 'system'].includes(event.kind ?? '') ||
      typeof event.summary !== 'string' ||
      typeof event.timestamp !== 'string' ||
      typeof event.source !== 'string' ||
      !Number.isFinite(Date.parse(event.timestamp))
    ) {
      return null
    }
    return {
      id: event.id.slice(0, 160),
      kind: event.kind as DiagnosticKind,
      summary: String(sanitizeDiagnosticValue(event.summary)).slice(0, 500),
      timestamp: event.timestamp,
      source: String(sanitizeDiagnosticValue(event.source)).slice(0, 500),
      requestId:
        typeof event.requestId === 'string'
          ? String(sanitizeDiagnosticValue(event.requestId)).slice(0, 160)
          : undefined,
      details: sanitizeDiagnosticValue(event.details),
    }
  } catch {
    return null
  }
}

export function subscribeToDiagnosticEvents(
  listener: (event: DiagnosticEvent) => void
) {
  if (!isDevelopmentDiagnosticsEnabled()) return () => undefined

  const handleWindowEvent = (event: Event) => {
    const diagnosticEvent = normalizeIncomingEvent(
      (event as CustomEvent<DiagnosticEvent>).detail
    )
    if (diagnosticEvent) listener(diagnosticEvent)
  }
  const channel =
    'BroadcastChannel' in window
      ? new BroadcastChannel(DIAGNOSTIC_CHANNEL_NAME)
      : null
  const handleChannelMessage = (event: MessageEvent) => {
    if (event.data?.type === 'event') {
      const diagnosticEvent = normalizeIncomingEvent(event.data.event)
      if (diagnosticEvent) listener(diagnosticEvent)
    }
  }

  window.addEventListener(DIAGNOSTIC_EVENT_NAME, handleWindowEvent)
  channel?.addEventListener('message', handleChannelMessage)

  return () => {
    window.removeEventListener(DIAGNOSTIC_EVENT_NAME, handleWindowEvent)
    channel?.removeEventListener('message', handleChannelMessage)
    channel?.close()
  }
}

export function requestAuthStateSnapshot() {
  getBroadcastChannel()?.postMessage({ type: 'auth-state-request' })
}

export function subscribeToAuthStateRequests(listener: () => void) {
  if (
    !isDevelopmentDiagnosticsEnabled() ||
    !('BroadcastChannel' in window)
  ) {
    return () => undefined
  }

  const channel = new BroadcastChannel(DIAGNOSTIC_CHANNEL_NAME)
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'auth-state-request') listener()
  }
  channel.addEventListener('message', handleMessage)
  return () => {
    channel.removeEventListener('message', handleMessage)
    channel.close()
  }
}

function getRequestUrl(config: InternalAxiosRequestConfig) {
  try {
    return new URL(config.url ?? '', config.baseURL).toString()
  } catch {
    return `${config.baseURL ?? ''}${config.url ?? ''}`
  }
}

export function recordApiRequest(
  clientName: string,
  config: InternalAxiosRequestConfig
) {
  if (!isDevelopmentDiagnosticsEnabled()) return config

  try {
    const diagnosticConfig = config as DiagnosticRequestConfig
    diagnosticConfig._diagnosticRequestId = nextId('request')
    diagnosticConfig._diagnosticStartedAt = performance.now()
    const method = config.method?.toUpperCase() ?? 'GET'

    publishDiagnosticEvent({
      kind: 'network',
      summary: `REQUEST ${method} ${config.url ?? ''}`,
      requestId: diagnosticConfig._diagnosticRequestId,
      details: {
        phase: 'request',
        client: clientName,
        method,
        url: getRequestUrl(config),
        headers: config.headers,
        params: config.params,
        body: config.data,
      },
    })
  } catch {
    // Diagnostics must never block an Axios request.
  }

  return config
}

export function recordApiResponse(
  clientName: string,
  response: AxiosResponse
) {
  if (!isDevelopmentDiagnosticsEnabled()) return response

  try {
    const config = response.config as DiagnosticRequestConfig
    const durationMs = config._diagnosticStartedAt
      ? Math.round(performance.now() - config._diagnosticStartedAt)
      : undefined

    publishDiagnosticEvent({
      kind: 'network',
      summary: `RESPONSE ${response.status} ${config.url ?? ''}`,
      requestId: config._diagnosticRequestId,
      details: {
        phase: 'response',
        client: clientName,
        method: config.method?.toUpperCase() ?? 'GET',
        url: getRequestUrl(config),
        status: response.status,
        statusText: response.statusText,
        durationMs,
        headers: response.headers,
        body: response.data,
      },
    })
  } catch {
    // Diagnostics must never alter an Axios response.
  }

  return response
}

export function recordApiError(clientName: string, error: unknown) {
  if (!isDevelopmentDiagnosticsEnabled()) return

  try {
    const axiosError = error as AxiosError
    const config = axiosError.config as DiagnosticRequestConfig | undefined
    const durationMs = config?._diagnosticStartedAt
      ? Math.round(performance.now() - config._diagnosticStartedAt)
      : undefined

    publishDiagnosticEvent({
      kind: 'network',
      summary: `ERROR ${axiosError.response?.status ?? 'NETWORK'} ${config?.url ?? ''}`,
      requestId: config?._diagnosticRequestId,
      details: {
        phase: 'error',
        client: clientName,
        method: config?.method?.toUpperCase(),
        url: config ? getRequestUrl(config) : undefined,
        status: axiosError.response?.status,
        durationMs,
        message: axiosError.message,
        body: axiosError.response?.data,
      },
    })
  } catch {
    // Diagnostics must never alter Axios error handling.
  }
}
