import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SetupRoute from '@/features/auth/components/setup-route'
import { navigateToGoogleLogin } from '@/features/auth/api/auth-api'
import {
  fetchSignupOptions,
  getSignupErrorMessage,
  getSignupOptionsErrorMessage,
  submitIntegratedSignup,
} from '@/features/auth/api/signup-api'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import type { SignupOptions } from '@/features/auth/types/signup'
import { mockRouter, resetNextNavigationMocks } from '@/test/mocks/next-navigation'

vi.mock('@/features/auth/api/auth-api', () => ({
  navigateToGoogleLogin: vi.fn(),
}))

vi.mock('@/features/auth/api/signup-api', () => ({
  fetchSignupOptions: vi.fn(),
  getSignupErrorMessage: vi.fn(),
  getSignupOptionsErrorMessage: vi.fn(),
  submitIntegratedSignup: vi.fn(),
}))

const options: SignupOptions = {
  regions: [{ id: 'region-seoul', name: '서울' }],
  themes: [{ id: 'theme-nature', name: '자연' }],
  transportMethods: [{ id: 'transport-car', name: '자가용' }],
  breeds: [{ id: 7, name: '골든리트리버' }],
  activities: [{ id: 'activity-walk', name: '산책' }],
}

beforeEach(() => {
  vi.mocked(fetchSignupOptions).mockResolvedValue(options)
  vi.mocked(getSignupErrorMessage).mockReturnValue(
    '회원가입을 완료하지 못했습니다. 입력 내용을 확인하고 다시 시도해주세요.'
  )
  vi.mocked(getSignupOptionsErrorMessage).mockReturnValue(
    '회원가입 선택지를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
  )
  vi.mocked(submitIntegratedSignup).mockResolvedValue({
    userId: 'user-id',
    nickname: '햇살여행자',
    email: 'user@example.com',
    petIds: [],
  })
})

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
  vi.mocked(fetchSignupOptions).mockReset()
  vi.mocked(getSignupErrorMessage).mockReset()
  vi.mocked(getSignupOptionsErrorMessage).mockReset()
  vi.mocked(submitIntegratedSignup).mockReset()
})

describe('SetupRoute', () => {
  it('submits the integrated signup once and starts a fresh login', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/setup')
    useAuthStore.setState({
      registrationToken: 'registration-token',
      setupStage: 'registration',
      status: 'unauthenticated',
    })

    render(<SetupRoute />)

    await user.type(
      await screen.findByPlaceholderText('사용할 닉네임을 입력하세요'),
      ' 햇살여행자 '
    )
    await user.click(screen.getByRole('button', { name: '서울' }))
    await user.click(screen.getByRole('button', { name: '자연' }))
    await user.click(screen.getByRole('button', { name: '자가용' }))
    await user.click(screen.getByRole('button', { name: '다음 — 반려동물 등록' }))
    await user.click(screen.getByRole('button', { name: '완료 — 회원가입하기' }))

    await waitFor(() =>
      expect(submitIntegratedSignup).toHaveBeenCalledWith({
        registrationToken: 'registration-token',
        user: {
          nickname: '햇살여행자',
          regionIds: ['region-seoul'],
          themeIds: ['theme-nature'],
          transportMethodIds: ['transport-car'],
        },
        pets: [],
      })
    )
    await waitFor(() => expect(navigateToGoogleLogin).toHaveBeenCalledOnce())
    expect(submitIntegratedSignup).toHaveBeenCalledOnce()
    expect(useAuthStore.getState().registrationToken).toBeNull()
    expect(useAuthStore.getState().setupStage).toBeNull()
    expect(navigateToGoogleLogin).toHaveBeenCalledWith()
  })

  it('keeps the registration token for a retry and starts login only after success', async () => {
    const user = userEvent.setup()
    vi.mocked(submitIntegratedSignup)
      .mockRejectedValueOnce({ status: 409 })
      .mockResolvedValueOnce({
        userId: 'user-id',
        nickname: '중복닉네임',
        email: 'user@example.com',
        petIds: [],
      })
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
    await user.click(screen.getByRole('button', { name: '완료 — 회원가입하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '회원가입을 완료하지 못했습니다.'
    )
    expect(useAuthStore.getState().registrationToken).toBe('registration-token')
    expect(navigateToGoogleLogin).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '완료 — 회원가입하기' }))

    await waitFor(() => expect(submitIntegratedSignup).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(navigateToGoogleLogin).toHaveBeenCalledOnce())
    expect(submitIntegratedSignup).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ registrationToken: 'registration-token' })
    )
    expect(submitIntegratedSignup).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ registrationToken: 'registration-token' })
    )
    expect(useAuthStore.getState().registrationToken).toBeNull()
    expect(navigateToGoogleLogin).toHaveBeenCalledOnce()
  })

  it('discards an expired registration token and restarts Google login', async () => {
    const user = userEvent.setup()
    vi.mocked(submitIntegratedSignup).mockRejectedValueOnce({ status: 401 })
    window.history.replaceState(null, '', '/setup')
    useAuthStore.setState({
      registrationToken: 'expired-registration-token',
      setupStage: 'registration',
      status: 'unauthenticated',
    })

    render(<SetupRoute />)

    await user.type(
      await screen.findByPlaceholderText('사용할 닉네임을 입력하세요'),
      '테스터'
    )
    await user.click(screen.getByRole('button', { name: '다음 — 반려동물 등록' }))
    await user.click(screen.getByRole('button', { name: '완료 — 회원가입하기' }))

    await waitFor(() => expect(navigateToGoogleLogin).toHaveBeenCalledOnce())
    expect(useAuthStore.getState().registrationToken).toBeNull()
    expect(useAuthStore.getState().setupStage).toBeNull()
  })

  it('keeps entered values mounted while refreshing changed options after a 404', async () => {
    const user = userEvent.setup()
    let resolveRefreshedOptions!: (value: SignupOptions) => void
    const refreshedOptionsPromise = new Promise<SignupOptions>((resolve) => {
      resolveRefreshedOptions = resolve
    })
    const refreshedOptions: SignupOptions = {
      ...options,
      regions: [{ id: 'region-busan', name: '부산' }],
    }
    vi.mocked(fetchSignupOptions)
      .mockReset()
      .mockResolvedValueOnce(options)
      .mockReturnValueOnce(refreshedOptionsPromise)
    vi.mocked(submitIntegratedSignup).mockRejectedValueOnce({ status: 404 })
    window.history.replaceState(null, '', '/setup')
    useAuthStore.setState({
      registrationToken: 'registration-token',
      setupStage: 'registration',
      status: 'unauthenticated',
    })

    render(<SetupRoute />)

    await user.type(
      await screen.findByPlaceholderText('사용할 닉네임을 입력하세요'),
      '입력보존'
    )
    await user.click(screen.getByRole('button', { name: '서울' }))
    await user.click(screen.getByRole('button', { name: '다음 — 반려동물 등록' }))
    await user.click(screen.getByRole('button', { name: '완료 — 회원가입하기' }))

    await waitFor(() => expect(fetchSignupOptions).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('heading', { name: '반려동물 정보' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '뒤로 가기' }))
    expect(screen.getByPlaceholderText('사용할 닉네임을 입력하세요')).toHaveValue(
      '입력보존'
    )
    expect(screen.getByRole('button', { name: '서울' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    resolveRefreshedOptions(refreshedOptions)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('사용할 닉네임을 입력하세요')).toHaveValue(
      '입력보존'
    )
    expect(screen.queryByRole('button', { name: '서울' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '부산' })).toBeInTheDocument()
  })

  it('shows a retry action when signup options fail to load', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchSignupOptions).mockRejectedValueOnce(new Error('network'))
    window.history.replaceState(null, '', '/setup')
    useAuthStore.setState({
      registrationToken: 'registration-token',
      setupStage: 'registration',
      status: 'unauthenticated',
    })

    render(<SetupRoute />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '회원가입 선택지를 불러오지 못했습니다.'
    )
    await user.click(screen.getByRole('button', { name: '다시 불러오기' }))
    expect(
      await screen.findByPlaceholderText('사용할 닉네임을 입력하세요')
    ).toBeInTheDocument()
    expect(fetchSignupOptions).toHaveBeenCalledTimes(2)
  })

  it('redirects direct setup access without a valid flow to login', async () => {
    window.history.replaceState(null, '', '/setup')

    render(<SetupRoute />)

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/login'))
    expect(fetchSignupOptions).not.toHaveBeenCalled()
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
})
