import { act, renderHook } from '@testing-library/react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('usePrefersReducedMotion', () => {
  it('keeps motion disabled when the browser preference cannot be read', () => {
    vi.mocked(window.matchMedia).mockReturnValue(undefined as unknown as MediaQueryList)

    const { result } = renderHook(() => usePrefersReducedMotion())

    expect(result.current).toBe(true)
  })

  it('tracks preference changes and removes its listener on unmount', () => {
    let listener: (() => void) | undefined
    const mediaQuery = {
      matches: false,
      addEventListener: vi.fn((_type: string, nextListener: () => void) => {
        listener = nextListener
      }),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList
    vi.mocked(window.matchMedia).mockReturnValue(mediaQuery)

    const { result, unmount } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)

    act(() => {
      Object.defineProperty(mediaQuery, 'matches', { configurable: true, value: true })
      listener?.()
    })
    expect(result.current).toBe(true)

    unmount()
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', listener)
  })

  it('keeps the server snapshot stable through hydration before reading the browser value', async () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList))

    function PreferenceProbe() {
      return <span>{usePrefersReducedMotion() ? 'reduced' : 'full'}</span>
    }

    const container = document.createElement('div')
    container.innerHTML = renderToString(<PreferenceProbe />)
    expect(container).toHaveTextContent('reduced')

    let root: Root | undefined
    await act(async () => {
      root = hydrateRoot(container, <PreferenceProbe />)
    })
    expect(container).toHaveTextContent('full')

    act(() => root?.unmount())
  })
})
