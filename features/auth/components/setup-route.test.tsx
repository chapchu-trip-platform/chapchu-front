import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SetupRoute from '@/features/auth/components/setup-route'
import {
  navigateToGoogleLogin,
  registerMember,
} from '@/features/auth/api/auth-api'
import { refreshAccessToken } from '@/lib/api/client'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { mockRouter, resetNextNavigationMocks } from '@/test/mocks/next-navigation'

vi.mock('@/features/auth/api/auth-api', () => ({
  navigateToGoogleLogin: vi.fn(),
  registerMember: vi.fn(),
}))

vi.mock('@/lib/api/client', () => ({
  refreshAccessToken: vi.fn(),
}))

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  useAuthStore.setState({
    accessToken: null,
    authNotice: null,
    registrationToken: null,
    sessionEpoch: 0,
    setupStage: null,
    status: 'idle',
  })
  resetNextNavigationMocks()
  vi.mocked(navigateToGoogleLogin).mockReset()
  vi.mocked(registerMember).mockReset()
  vi.mocked(refreshAccessToken).mockReset()
})

describe('SetupRoute', () => {
  it('consumes callback registration state before registering a nickname', async () => {
    const user = userEvent.setup()
    vi.mocked(registerMember).mockResolvedValue()
    window.history.replaceState(null, '', '/setup')
    useAuthStore.setState({
      registrationToken: 'registration-token',
      setupStage: 'registration',
      status: 'unauthenticated',
    })

    render(<SetupRoute />)

    const nickname = await screen.findByPlaceholderText('사용할 닉네임을 입력하세요')
    expect(window.location.search).toBe('')
    expect(useAuthStore.getState().registrationToken).toBe('registration-token')

    await user.type(nickname, ' 햇살여행자 ')
    await user.click(screen.getByRole('button', { name: '다음 — 반려동물 등록' }))

    await waitFor(() =>
      expect(registerMember).toHaveBeenCalledWith('registration-token', '햇살여행자')
    )
    expect(useAuthStore.getState().registrationToken).toBeNull()
    expect(sessionStorage.getItem('chapchu.auth.post-login-destination')).toBe('pet-setup')
    expect(navigateToGoogleLogin).toHaveBeenCalledWith({
      preservePostLoginDestination: true,
    })
  })

  it('keeps registration context when registration fails so the user can retry', async () => {
    const user = userEvent.setup()
    vi.mocked(registerMember).mockRejectedValue(new Error('backend details'))
    window.history.replaceState(null, '', '/setup')
    useAuthStore.setState({
      registrationToken: 'registration-token',
      setupStage: 'registration',
      status: 'unauthenticated',
    })

    render(<SetupRoute />)

    await user.type(
      await screen.findByPlaceholderText('사용할 닉네임을 입력하세요'),
      '중복닉네임'
    )
    await user.click(screen.getByRole('button', { name: '다음 — 반려동물 등록' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '회원 등록을 완료하지 못했습니다.'
    )
    expect(useAuthStore.getState().registrationToken).toBe('registration-token')
    expect(navigateToGoogleLogin).not.toHaveBeenCalled()
  })

  it('redirects direct setup access without a valid flow to login', async () => {
    window.history.replaceState(null, '', '/setup')

    render(<SetupRoute />)

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/login'))
  })

  it('scrubs a legacy registration token before returning to login', async () => {
    window.history.replaceState(
      null,
      '',
      '/setup?registration_token=legacy-registration-token'
    )

    render(<SetupRoute />)

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/login'))
    expect(window.location.pathname).toBe('/setup')
    expect(window.location.search).toBe('')
    expect(useAuthStore.getState().registrationToken).toBeNull()
  })

  it('returns to login when the pet setup session cannot be restored', async () => {
    window.history.replaceState(null, '', '/setup?step=pet')
    vi.mocked(refreshAccessToken).mockRejectedValue(new Error('expired session'))

    render(<SetupRoute />)

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/login'))
    expect(useAuthStore.getState().setupStage).toBeNull()
  })

  it('restores the BFF session before showing a reloaded pet setup step', async () => {
    window.history.replaceState(null, '', '/setup?step=pet')
    vi.mocked(refreshAccessToken).mockImplementation(async () => {
      useAuthStore.getState().setAccessToken('restored-token')
      return 'restored-token'
    })

    render(<SetupRoute />)

    expect(await screen.findByPlaceholderText('반려동물 이름')).toBeInTheDocument()
    expect(refreshAccessToken).toHaveBeenCalledOnce()
    expect(screen.queryByPlaceholderText('사용할 닉네임을 입력하세요')).not.toBeInTheDocument()
  })
})
