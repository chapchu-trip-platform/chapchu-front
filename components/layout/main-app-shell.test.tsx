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
    withdrawalAttemptEpoch: null,
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

  it('hides global navigation while a community post is being written', () => {
    setMockPathname('/community/write')
    useAuthStore.setState({ status: 'authenticated' })

    render(
      <MainAppShell>
        <p>post editor</p>
      </MainAppShell>
    )

    expect(screen.getByText('post editor')).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('requests the album root when the active album tab is pressed', async () => {
    setMockPathname('/album')
    useAuthStore.getState().startDemoSession()
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    render(
      <MainAppShell>
        <p>album content</p>
      </MainAppShell>
    )

    await screen.findByRole('link', { name: '앨범' }).then((link) => link.click())

    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'album-return-to-root' }))
    expect(mockRouter.push).not.toHaveBeenCalled()
    dispatchSpy.mockRestore()
  })

  it('requests the profile root when the active profile tab is pressed', async () => {
    setMockPathname('/my')
    useAuthStore.getState().startDemoSession()
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    render(
      <MainAppShell>
        <p>profile content</p>
      </MainAppShell>
    )

    await screen.findByRole('link', { name: '내정보' }).then((link) => link.click())

    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'profile-return-to-root' }))
    expect(mockRouter.push).not.toHaveBeenCalled()
    dispatchSpy.mockRestore()
  })

  it.each([
    ['/home', '홈', 'home-return-to-root'],
    ['/community', '게시판', 'board-return-to-root'],
  ])('requests the first screen when %s is reselected', (pathname, label, eventType) => {
    setMockPathname(pathname)
    useAuthStore.getState().startDemoSession()
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    render(
      <MainAppShell>
        <p>tab content</p>
      </MainAppShell>
    )

    screen.getByRole('link', { name: label }).click()

    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: eventType }))
    dispatchSpy.mockRestore()
  })
})
