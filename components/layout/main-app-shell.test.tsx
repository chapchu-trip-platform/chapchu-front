import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MainAppShell from '@/components/layout/main-app-shell'
import { refreshAccessToken } from '@/lib/api/client'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import {
  mockRouter,
  resetNextNavigationMocks,
  setMockPathname,
} from '@/test/mocks/next-navigation'

vi.mock('@/lib/api/client', () => ({
  refreshAccessToken: vi.fn(),
}))

afterEach(() => {
  cleanup()
  useAuthStore.setState({
    accessToken: null,
    authNotice: null,
    registrationToken: null,
    sessionEpoch: 0,
    setupStage: null,
    status: 'idle',
  })
  resetNextNavigationMocks()
  vi.mocked(refreshAccessToken).mockReset()
})

describe('MainAppShell auth gate', () => {
  it('restores a BFF session before rendering protected content', async () => {
    setMockPathname('/home')
    let resolveRefresh!: (accessToken: string) => void
    vi.mocked(refreshAccessToken).mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve
      })
    )

    render(
      <MainAppShell>
        <p>protected content</p>
      </MainAppShell>
    )

    expect(screen.getByText('로그인 상태를 확인하고 있어요…')).toBeInTheDocument()
    act(() => {
      useAuthStore.getState().setAccessToken('restored-token')
      resolveRefresh('restored-token')
    })
    expect(await screen.findByText('protected content')).toBeInTheDocument()
    expect(refreshAccessToken).toHaveBeenCalledOnce()
  })

  it('redirects to login when the BFF session cannot be restored', async () => {
    setMockPathname('/home')
    vi.mocked(refreshAccessToken).mockImplementation(async () => {
      useAuthStore.getState().clearSession()
      throw new Error('unauthorized')
    })

    render(
      <MainAppShell>
        <p>protected content</p>
      </MainAppShell>
    )

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/login'))
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
  })

  it('keeps the explicit demo session available without a backend refresh', () => {
    setMockPathname('/home')
    useAuthStore.getState().startDemoSession()

    render(
      <MainAppShell>
        <p>demo content</p>
      </MainAppShell>
    )

    expect(screen.getByText('demo content')).toBeInTheDocument()
    expect(refreshAccessToken).not.toHaveBeenCalled()
  })
})
