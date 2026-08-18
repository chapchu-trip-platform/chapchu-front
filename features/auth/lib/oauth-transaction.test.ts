import { afterEach, describe, expect, it } from 'vitest'
import {
  beginOAuthTransaction,
  consumeOAuthTransaction,
} from '@/features/auth/lib/oauth-transaction'

afterEach(() => {
  sessionStorage.clear()
})

describe('OAuth transaction marker', () => {
  it('allows one callback in the tab that started login', () => {
    beginOAuthTransaction(1_000)

    expect(consumeOAuthTransaction(2_000)).toBe(true)
    expect(consumeOAuthTransaction(2_000)).toBe(false)
  })

  it('rejects missing, malformed, future, and expired markers', () => {
    expect(consumeOAuthTransaction(1_000)).toBe(false)

    sessionStorage.setItem('chapchu.auth.oauth-transaction', 'invalid')
    expect(consumeOAuthTransaction(1_000)).toBe(false)

    beginOAuthTransaction(2_000)
    expect(consumeOAuthTransaction(1_000)).toBe(false)

    beginOAuthTransaction(1_000)
    expect(consumeOAuthTransaction(10 * 60 * 1_000 + 1_001)).toBe(false)
  })
})
