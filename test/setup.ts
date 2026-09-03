import '@testing-library/jest-dom/vitest'
import React from 'react'
import { vi } from 'vitest'
import { getMockPathname, mockRouter, mockSearchParams } from '@/test/mocks/next-navigation'

process.env.NEXT_PUBLIC_API_BASE_URL ??= 'http://localhost:8080'

vi.mock('next/image', () => ({
  default: ({ alt, src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement('img', { alt: alt ?? '', src, ...props }),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => getMockPathname(),
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
})

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverMock {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds = []

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver
globalThis.IntersectionObserver = IntersectionObserverMock as typeof IntersectionObserver
