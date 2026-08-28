'use client'

const OAUTH_TRANSACTION_KEY = 'chapchu.auth.oauth-transaction'
const OAUTH_TRANSACTION_TTL_MS = 10 * 60 * 1_000

interface OAuthTransaction {
  id: string
  startedAt: number
}

export function beginOAuthTransaction(now = Date.now()) {
  const transaction: OAuthTransaction = {
    id: crypto.randomUUID(),
    startedAt: now,
  }
  sessionStorage.setItem(OAUTH_TRANSACTION_KEY, JSON.stringify(transaction))
}

export function consumeOAuthTransaction(now = Date.now()) {
  let serialized: string | null
  try {
    serialized = sessionStorage.getItem(OAUTH_TRANSACTION_KEY)
    sessionStorage.removeItem(OAUTH_TRANSACTION_KEY)
  } catch {
    return false
  }
  if (!serialized) return false

  try {
    const transaction = JSON.parse(serialized) as Partial<OAuthTransaction>
    return (
      typeof transaction.id === 'string' &&
      transaction.id.length > 0 &&
      typeof transaction.startedAt === 'number' &&
      transaction.startedAt <= now &&
      now - transaction.startedAt <= OAUTH_TRANSACTION_TTL_MS
    )
  } catch {
    return false
  }
}
