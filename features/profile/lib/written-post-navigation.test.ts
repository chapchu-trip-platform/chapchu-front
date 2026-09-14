import { beforeEach, describe, expect, it, vi } from 'vitest'
import { confirmWrittenPostHistory, markWrittenPostNavigation } from './written-post-navigation'

beforeEach(() => {
  vi.restoreAllMocks()
  window.sessionStorage.clear()
  window.history.replaceState({}, '', '/community?post=post-1&from=my-posts')
})

describe('written post navigation history', () => {
  it('confirms a recent same-tab navigation and records it in history state', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    markWrittenPostNavigation('post-1')

    expect(confirmWrittenPostHistory('post-1')).toBe(true)
    expect(window.sessionStorage).toHaveLength(0)
    expect(window.history.state).toMatchObject({ chapchuWrittenPostId: 'post-1' })
  })

  it('reuses the destination history marker after back-forward navigation', () => {
    window.history.replaceState({ chapchuWrittenPostId: 'post-1' }, '', window.location.href)

    expect(confirmWrittenPostHistory('post-1')).toBe(true)
  })

  it('rejects direct, mismatched, and expired navigation attempts', () => {
    expect(confirmWrittenPostHistory('post-1')).toBe(false)

    const now = vi.spyOn(Date, 'now').mockReturnValue(60_000)
    markWrittenPostNavigation('other-post')
    expect(confirmWrittenPostHistory('post-1')).toBe(false)

    now.mockReturnValue(100_000)
    markWrittenPostNavigation('post-1')
    now.mockReturnValue(140_001)
    expect(confirmWrittenPostHistory('post-1')).toBe(false)
  })
})
