import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProfileRoute from '@/features/profile/components/profile-route'
import { logout } from '@/features/auth/api/auth-api'
import {
  createPet,
  deletePet,
  fetchBookmarks,
  fetchMyPosts,
  fetchMyReviews,
  fetchPetOptions,
  fetchPets,
  fetchProfileSummary,
  fetchWishlist,
  getProfileErrorMessage,
  removeBookmark,
  removeWishlistPlace,
  updateNickname,
  updatePet,
  withdrawAccount,
} from '@/features/profile/api/profile-api'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { usePetStore } from '@/features/profile/stores/pet-store'
import { mockRouter, resetNextNavigationMocks } from '@/test/mocks/next-navigation'

vi.mock('@/features/auth/api/auth-api', () => ({
  logout: vi.fn(),
}))

vi.mock('@/features/profile/api/profile-api', () => ({
  createPet: vi.fn(),
  deletePet: vi.fn(),
  fetchBookmarks: vi.fn(),
  fetchMyPosts: vi.fn(),
  fetchMyReviews: vi.fn(),
  fetchPetOptions: vi.fn(),
  fetchPets: vi.fn(),
  fetchProfileSummary: vi.fn(),
  fetchWishlist: vi.fn(),
  getProfileErrorMessage: vi.fn(),
  removeBookmark: vi.fn(),
  removeWishlistPlace: vi.fn(),
  updateNickname: vi.fn(),
  updatePet: vi.fn(),
  withdrawAccount: vi.fn(),
}))

const pet = {
  id: 'pet-id',
  petName: '초코',
  breedId: 7,
  breedName: '골든리트리버',
  size: 'MEDIUM' as const,
  age: 3,
  activities: [{ id: 'activity-id', name: '산책' }],
}

beforeEach(() => {
  vi.mocked(fetchProfileSummary).mockResolvedValue({
    nickname: '초코맘',
    email: 'user@example.com',
    petCount: 1,
  })
  vi.mocked(fetchPets).mockResolvedValue([pet])
  vi.mocked(fetchPetOptions).mockResolvedValue({
    breeds: [{ id: 7, name: '골든리트리버' }],
    activities: [{ id: 'activity-id', name: '산책' }],
  })
  vi.mocked(fetchMyPosts).mockResolvedValue([
    {
      id: 'post-id',
      title: '초코와 여행 기록',
      content: '즐거운 여행이었어요.',
      viewCount: 10,
      recommendationCount: 3,
      commentCount: 2,
      nickname: '초코맘',
      photoUrl: null,
      createdAt: null,
    },
  ])
  vi.mocked(fetchBookmarks).mockResolvedValue([])
  vi.mocked(fetchWishlist).mockResolvedValue([])
  vi.mocked(fetchMyReviews).mockResolvedValue([])
  vi.mocked(getProfileErrorMessage).mockReturnValue(
    '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'
  )
  vi.mocked(updateNickname).mockResolvedValue('새닉네임')
  vi.mocked(createPet).mockResolvedValue({ ...pet, id: 'new-pet-id', petName: '보리' })
  vi.mocked(updatePet).mockResolvedValue(pet)
  vi.mocked(deletePet).mockResolvedValue()
  vi.mocked(removeBookmark).mockResolvedValue()
  vi.mocked(removeWishlistPlace).mockResolvedValue()
  vi.mocked(withdrawAccount).mockResolvedValue()
  vi.mocked(logout).mockResolvedValue()
})

afterEach(() => {
  cleanup()
  usePetStore.setState({ pets: [], selectedPetId: null })
  useAuthStore.setState({ status: 'authenticated', accessToken: 'test-token' })
  resetNextNavigationMocks()
  vi.clearAllMocks()
})

describe('ProfileRoute', () => {
  it('loads the mypage summary and pets from the profile API', async () => {
    render(<ProfileRoute />)

    expect(await screen.findByRole('heading', { name: '초코맘' })).toBeInTheDocument()
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('초코').length).toBeGreaterThan(0)
    expect(fetchProfileSummary).toHaveBeenCalledOnce()
    expect(fetchPets).toHaveBeenCalledOnce()
  })

  it('opens nickname settings and updates the visible nickname', async () => {
    const user = userEvent.setup()
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: '닉네임 수정' }))
    const input = screen.getByLabelText('현재 닉네임')
    await user.clear(input)
    await user.type(input, '새닉네임')
    await user.click(screen.getByRole('button', { name: '변경하기' }))

    await waitFor(() => expect(updateNickname).toHaveBeenCalledWith('초코맘', '새닉네임'))
    expect(await screen.findByText('닉네임이 변경되었습니다.')).toBeInTheDocument()
  })

  it('loads written posts only after the user opens the tab', async () => {
    const user = userEvent.setup()
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    expect(fetchMyPosts).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /작성한 글.*내 작성글 보기/ }))

    expect(await screen.findByText('초코와 여행 기록')).toBeInTheDocument()
    expect(fetchMyPosts).toHaveBeenCalledOnce()
  })

  it('registers a pet with options loaded from the public APIs', async () => {
    const user = userEvent.setup()
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /반려동물 관리.*초코 · 1마리/ }))
    await user.click(await screen.findByRole('button', { name: '반려동물 추가하기' }))
    await user.type(await screen.findByPlaceholderText('반려견 이름'), '보리')
    await user.selectOptions(screen.getByLabelText('견종'), '7')
    await user.type(screen.getByPlaceholderText('3'), '2')
    await user.click(screen.getByRole('button', { name: '산책' }))
    await user.click(screen.getByRole('button', { name: '저장하기' }))

    await waitFor(() =>
      expect(createPet).toHaveBeenCalledWith({
        petName: '보리',
        breedId: 7,
        size: 'SMALL',
        age: 2,
        activityIds: ['activity-id'],
      })
    )
    expect(await screen.findByText('보리')).toBeInTheDocument()
  })

  it('withdraws only after the confirmation acknowledgement', async () => {
    const user = userEvent.setup()
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))
    expect(screen.getByRole('button', { name: '탈퇴하기' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '위 내용을 확인했습니다' }))
    await user.click(screen.getByRole('button', { name: '탈퇴하기' }))

    await waitFor(() => expect(withdrawAccount).toHaveBeenCalledOnce())
    expect(logout).toHaveBeenCalledOnce()
    expect(usePetStore.getState().pets).toEqual([])
    expect(mockRouter.replace).toHaveBeenCalledWith('/login')
  })

  it('clears stale pet state when the initial profile request fails', async () => {
    usePetStore.setState({ pets: [{ ...pet, id: 'stale-pet', petName: '이전사용자반려견' }] })
    vi.mocked(fetchProfileSummary).mockRejectedValueOnce(new Error('failed'))

    render(<ProfileRoute />)

    expect(
      await screen.findByText('요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.')
    ).toBeInTheDocument()
    expect(screen.queryByText('이전사용자반려견')).not.toBeInTheDocument()
    expect(usePetStore.getState().pets).toEqual([])
  })

  it('clears pet state when the user logs out', async () => {
    const user = userEvent.setup()
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    await waitFor(() => expect(logout).toHaveBeenCalledOnce())
    expect(usePetStore.getState().pets).toEqual([])
    expect(mockRouter.replace).toHaveBeenCalledWith('/login')
  })

  it('retries pet options after a failed request', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchPetOptions).mockRejectedValueOnce(new Error('failed'))
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /반려동물 관리.*초코 · 1마리/ }))
    await user.click(await screen.findByRole('button', { name: '반려동물 추가하기' }))
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(await screen.findByPlaceholderText('반려견 이름')).toBeInTheDocument()
    expect(fetchPetOptions).toHaveBeenCalledTimes(2)
  })

  it('prevents duplicate pet deletion while the first request is pending', async () => {
    const user = userEvent.setup()
    let resolveDelete: (() => void) | undefined
    vi.mocked(deletePet).mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveDelete = resolve })
    )
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /반려동물 관리.*초코 · 1마리/ }))
    await user.click(await screen.findByRole('button', { name: '초코 삭제' }))
    const deleteButton = screen.getByRole('button', { name: /완전히 삭제하기/ })
    await user.click(deleteButton)
    expect(deleteButton).toBeDisabled()
    await user.click(deleteButton)
    expect(deletePet).toHaveBeenCalledOnce()

    resolveDelete?.()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '초코 삭제' })).not.toBeInTheDocument())
  })

  it('requires explicit breed and age values before pet registration', async () => {
    const user = userEvent.setup()
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /반려동물 관리.*초코 · 1마리/ }))
    await user.click(await screen.findByRole('button', { name: '반려동물 추가하기' }))
    await user.type(await screen.findByPlaceholderText('반려견 이름'), '보리')

    expect(screen.getByRole('button', { name: '저장하기' })).toBeDisabled()
    expect(screen.getByLabelText('견종')).toHaveValue('')
  })

  it('traps focus in settings and restores it after the exit transition', async () => {
    const user = userEvent.setup()
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    const settingsTrigger = screen.getByRole('button', { name: /작성한 글.*내 작성글 보기/ })
    await user.click(settingsTrigger)

    const settingsDialog = await screen.findByRole('dialog', { name: '내정보 설정' })
    expect(settingsDialog).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '뒤로 가기' })).toHaveFocus()
    expect(settingsTrigger.closest('[inert]')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '내정보 설정' })).not.toBeInTheDocument())
    expect(settingsTrigger).toHaveFocus()
  })
})
