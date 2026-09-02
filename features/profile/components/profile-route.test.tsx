import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
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
import {
  PROFILE_MOCK_COUNTS,
  mockProfileBookmarks,
  mockProfileMemoryAlbums,
  mockProfilePetOptions,
  mockProfilePets,
  mockProfilePosts,
  mockProfileReviews,
  mockProfileStamps,
  mockProfileSummary,
  mockProfileWishlist,
} from '@/data/mock/profile'

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

const pet = mockProfilePets[0]

function expectScrollSizedMock(items: unknown[], expectedCount: number) {
  expect(items).toHaveLength(expectedCount)
  expect(items.length).toBeGreaterThanOrEqual(10)
  expect(items.length).toBeLessThanOrEqual(50)
}

function expectUnique(values: string[]) {
  expect(new Set(values).size).toBe(values.length)
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

beforeEach(() => {
  vi.mocked(fetchProfileSummary).mockResolvedValue({ ...mockProfileSummary, petCount: 1 })
  vi.mocked(fetchPets).mockResolvedValue([pet])
  vi.mocked(fetchPetOptions).mockResolvedValue(mockProfilePetOptions)
  vi.mocked(fetchMyPosts).mockResolvedValue(mockProfilePosts)
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
  it('keeps animated placeholders visible until the profile data is ready', async () => {
    const summaryRequest = createDeferred<Awaited<ReturnType<typeof fetchProfileSummary>>>()
    const petsRequest = createDeferred<Awaited<ReturnType<typeof fetchPets>>>()
    vi.mocked(fetchProfileSummary).mockReturnValueOnce(summaryRequest.promise)
    vi.mocked(fetchPets).mockReturnValueOnce(petsRequest.promise)

    render(<ProfileRoute />)

    expect(screen.getByRole('status')).toHaveTextContent(
      '내정보와 반려동물 정보를 불러오는 중'
    )
    expect(screen.getByRole('region', { name: '내정보 콘텐츠' })).toHaveAttribute(
      'aria-busy',
      'true'
    )
    expect(screen.queryByText('이메일 정보 없음')).not.toBeInTheDocument()
    expect(screen.queryByText('등록된 반려견이 없습니다.')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /반려동물 관리.*반려동물 정보를 불러오는 중/ })
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: '관리' })).toBeDisabled()

    await act(async () => {
      summaryRequest.resolve({ ...mockProfileSummary, petCount: 1 })
      await Promise.resolve()
    })

    expect(screen.getByRole('status')).toHaveTextContent(
      '내정보와 반려동물 정보를 불러오는 중'
    )
    expect(screen.queryByRole('heading', { name: '초코맘' })).not.toBeInTheDocument()

    await act(async () => {
      petsRequest.resolve([pet])
      await Promise.resolve()
    })

    expect(await screen.findByRole('heading', { name: '초코맘' })).toBeInTheDocument()
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('내정보 불러오기 완료')
      expect(screen.getByRole('region', { name: '내정보 콘텐츠' })).toHaveAttribute(
        'aria-busy',
        'false'
      )
    })
    expect(screen.getByRole('button', { name: '관리' })).toBeEnabled()
  })

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

  it('renders every pet in the pet management list', async () => {
    const user = userEvent.setup()
    expectScrollSizedMock(mockProfilePets, PROFILE_MOCK_COUNTS.pets)
    expectUnique(mockProfilePets.map((item) => item.id))
    vi.mocked(fetchProfileSummary).mockResolvedValue(mockProfileSummary)
    vi.mocked(fetchPets).mockResolvedValue(mockProfilePets)
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(
      screen.getByRole('button', {
        name: new RegExp(`반려동물 관리.*초코 · ${mockProfilePets.length}마리`),
      })
    )
    expect(await screen.findByRole('button', { name: '반려동물 추가하기' })).toBeInTheDocument()

    for (const profilePet of mockProfilePets) {
      expect(screen.getByRole('button', { name: `${profilePet.petName} 수정` })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `${profilePet.petName} 삭제` })).toBeInTheDocument()
      expect(
        screen.getByText(`${profilePet.breedName} · ${profilePet.size === 'SMALL' ? '소형' : profilePet.size === 'MEDIUM' ? '중형' : '대형'} · ${profilePet.age}살`)
      ).toBeInTheDocument()
      for (const activity of profilePet.activities) {
        expect(screen.getAllByText(activity.name).length).toBeGreaterThan(0)
      }
    }
  })

  it('renders acquired and locked stamps from the profile mock list', async () => {
    const user = userEvent.setup()
    expectScrollSizedMock(mockProfileStamps, PROFILE_MOCK_COUNTS.stamps)
    expectUnique(mockProfileStamps.map((item) => item.id))
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /스탬프.*API 준비 중/ }))
    expect(await screen.findByText('방문한 지역의 스탬프를 모아보세요!')).toBeInTheDocument()

    for (const stamp of mockProfileStamps) {
      expect(screen.getByText(stamp.region)).toBeInTheDocument()
      if (stamp.acquired) {
        expect(screen.getAllByText(`${stamp.count}회 방문`).length).toBeGreaterThan(0)
        expect(screen.getByText(stamp.date)).toBeInTheDocument()
      }
    }
    expect(screen.getAllByText('미획득')).toHaveLength(
      mockProfileStamps.filter((stamp) => !stamp.acquired).length
    )
  })

  it('renders every memory album from the profile mock list', async () => {
    const user = userEvent.setup()
    expectScrollSizedMock(mockProfileMemoryAlbums, PROFILE_MOCK_COUNTS.memoryAlbums)
    expectUnique(mockProfileMemoryAlbums.map((item) => item.id))
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /추억 앨범.*API 준비 중/ }))
    expect(await screen.findByText(/무지개 다리를 건넌/)).toBeInTheDocument()

    for (const album of mockProfileMemoryAlbums) {
      expect(screen.getByText(album.petName)).toBeInTheDocument()
      expect(screen.getAllByText(album.breed).length).toBeGreaterThan(0)
      expect(screen.getByText(album.period)).toBeInTheDocument()
      expect(screen.getByText(album.note, { exact: false })).toBeInTheDocument()
      expect(screen.getByText(`${album.albumCount}개의 여행 앨범`)).toBeInTheDocument()
    }
  })

  it('renders every written post with list metrics', async () => {
    const user = userEvent.setup()
    expectScrollSizedMock(mockProfilePosts, PROFILE_MOCK_COUNTS.posts)
    expectUnique(mockProfilePosts.map((item) => item.id))
    vi.mocked(fetchMyPosts).mockResolvedValue(mockProfilePosts)
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /작성한 글.*내 작성글 보기/ }))
    await screen.findByText(mockProfilePosts[0].title)

    for (const post of mockProfilePosts) {
      expect(screen.getByText(post.title)).toBeInTheDocument()
      expect(screen.getAllByText(`조회 ${post.viewCount}`).length).toBeGreaterThan(0)
      expect(screen.getAllByText(`추천 ${post.recommendationCount}`).length).toBeGreaterThan(0)
      expect(screen.getAllByText(`댓글 ${post.commentCount}`).length).toBeGreaterThan(0)
    }
  })

  it('renders every wishlist place with its removal action', async () => {
    const user = userEvent.setup()
    expectScrollSizedMock(mockProfileWishlist, PROFILE_MOCK_COUNTS.wishlist)
    expectUnique(mockProfileWishlist.map((item) => item.placeId))
    vi.mocked(fetchWishlist).mockResolvedValue(mockProfileWishlist)
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /장소 위시리스트.*저장한 장소 보기/ }))
    await screen.findByText(mockProfileWishlist[0].placeName)

    for (const place of mockProfileWishlist) {
      expect(screen.getByText(place.placeName)).toBeInTheDocument()
      expect(screen.getByText(place.address)).toBeInTheDocument()
      expect(screen.getByText(`리뷰 ${place.reviewCount}`)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `${place.placeName} 위시리스트에서 제거` })).toBeInTheDocument()
    }
  })

  it('renders every bookmarked post with its removal action', async () => {
    const user = userEvent.setup()
    expectScrollSizedMock(mockProfileBookmarks, PROFILE_MOCK_COUNTS.bookmarks)
    expectUnique(mockProfileBookmarks.map((item) => item.id))
    vi.mocked(fetchBookmarks).mockResolvedValue(mockProfileBookmarks)
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /북마크.*저장한 게시글 보기/ }))
    await screen.findByText(mockProfileBookmarks[0].title)

    for (const bookmark of mockProfileBookmarks) {
      expect(screen.getByText(bookmark.title)).toBeInTheDocument()
      expect(screen.getAllByText(bookmark.nickname).length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: `${bookmark.title} 북마크 해제` })).toBeInTheDocument()
    }
  })

  it('renders every review with rating and contents', async () => {
    const user = userEvent.setup()
    expectScrollSizedMock(mockProfileReviews, PROFILE_MOCK_COUNTS.reviews)
    expectUnique(mockProfileReviews.map((item) => item.id))
    vi.mocked(fetchMyReviews).mockResolvedValue(mockProfileReviews)
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /작성한 리뷰.*내 리뷰 보기/ }))
    await screen.findByText(mockProfileReviews[0].contents)

    for (const review of mockProfileReviews) {
      expect(screen.getByText(review.contents)).toBeInTheDocument()
      expect(screen.getAllByLabelText(`별점 ${review.rating}점`).length).toBeGreaterThan(0)
    }
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
        activityIds: ['activity-walk'],
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
    const user = userEvent.setup()
    const retrySummaryRequest = createDeferred<Awaited<ReturnType<typeof fetchProfileSummary>>>()
    const retryPetsRequest = createDeferred<Awaited<ReturnType<typeof fetchPets>>>()
    usePetStore.setState({ pets: [{ ...pet, id: 'stale-pet', petName: '이전사용자반려견' }] })
    vi.mocked(fetchProfileSummary)
      .mockRejectedValueOnce(new Error('failed'))
      .mockReturnValueOnce(retrySummaryRequest.promise)
    vi.mocked(fetchPets)
      .mockResolvedValueOnce([pet])
      .mockReturnValueOnce(retryPetsRequest.promise)

    render(<ProfileRoute />)

    expect(
      await screen.findByText('요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.')
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('내정보를 불러오지 못했습니다')
    expect(screen.getByText('프로필 정보를 표시할 수 없어요')).toBeInTheDocument()
    expect(screen.getByText('반려동물 정보를 표시할 수 없어요.')).toBeInTheDocument()
    expect(screen.queryByText('이메일 정보 없음')).not.toBeInTheDocument()
    expect(screen.queryByText('등록된 반려견이 없습니다.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '관리' })).toBeDisabled()
    expect(screen.queryByText('이전사용자반려견')).not.toBeInTheDocument()
    expect(usePetStore.getState().pets).toEqual([])

    await user.click(screen.getByRole('button', { name: '다시 불러오기' }))
    expect(screen.getByRole('status')).toHaveTextContent(
      '내정보와 반려동물 정보를 불러오는 중'
    )
    expect(screen.getByRole('region', { name: '내정보 콘텐츠' })).toHaveAttribute(
      'aria-busy',
      'true'
    )

    await act(async () => {
      retrySummaryRequest.resolve({ ...mockProfileSummary, petCount: 1 })
      retryPetsRequest.resolve([pet])
      await Promise.resolve()
    })

    expect(await screen.findByRole('heading', { name: '초코맘' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('내정보 불러오기 완료')
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
