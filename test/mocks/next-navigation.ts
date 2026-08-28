import { vi } from 'vitest'

export const mockRouter = {
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}

export const mockSearchParams = new URLSearchParams()

let mockPathname = '/'

export function getMockPathname() {
  return mockPathname
}

export function setMockPathname(pathname: string) {
  mockPathname = pathname
}

export function setMockSearchParams(init?: string | URLSearchParams | Record<string, string>) {
  Array.from(mockSearchParams.keys()).forEach((key) => mockSearchParams.delete(key))

  const nextParams = new URLSearchParams(init)
  nextParams.forEach((value, key) => {
    mockSearchParams.set(key, value)
  })
}

export function resetNextNavigationMocks() {
  setMockPathname('/')
  setMockSearchParams()
  Object.values(mockRouter).forEach((mock) => mock.mockReset())
}
