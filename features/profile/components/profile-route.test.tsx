import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  fetchProfilePhoto,
  fetchProfileSummary,
  fetchStampCollection,
  fetchWishlist,
  getProfileErrorMessage,
  removeBookmark,
  removeWishlistPlace,
  updateNickname,
  updatePet,
  updatePetPhoto,
  updateProfilePhoto,
  withdrawAccount,
} from '@/features/profile/api/profile-api'
import { fetchPhotoDownload, savePhotos, uploadPhotoFiles } from '@/features/photos/api/photo-api'
import { fetchAlbumsByPet } from '@/features/album/api/albums-api'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { usePetStore } from '@/features/profile/stores/pet-store'
import { mockRouter, resetNextNavigationMocks } from '@/test/mocks/next-navigation'
import {
  PROFILE_MOCK_COUNTS,
  mockProfileBookmarks,
  mockProfilePetOptions,
  mockProfilePets,
  mockProfilePosts,
  mockProfileReviews,
  mockProfileSummary,
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
  fetchProfilePhoto: vi.fn(),
  fetchProfileSummary: vi.fn(),
  fetchStampCollection: vi.fn(),
  fetchWishlist: vi.fn(),
  getProfileErrorMessage: vi.fn(),
  removeBookmark: vi.fn(),
  removeWishlistPlace: vi.fn(),
  updateNickname: vi.fn(),
  updatePet: vi.fn(),
  updatePetPhoto: vi.fn(),
  updateProfilePhoto: vi.fn(),
  withdrawAccount: vi.fn(),
}))

vi.mock('@/features/photos/api/photo-api', () => ({
  fetchPhotoDownload: vi.fn(),
  savePhotos: vi.fn(),
  uploadPhotoFiles: vi.fn(),
}))

vi.mock('@/features/album/api/albums-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/album/api/albums-api')>()
  return {
    ...actual,
    fetchAlbumsByPet: vi.fn(),
  }
})

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
  window.sessionStorage.clear()
  vi.mocked(fetchProfileSummary).mockResolvedValue({ ...mockProfileSummary, petCount: 1 })
  vi.mocked(fetchPets).mockResolvedValue([pet])
  vi.mocked(fetchProfilePhoto).mockResolvedValue({ photoId: null, downloadUrl: null })
  vi.mocked(fetchStampCollection).mockResolvedValue({
    acquiredCount: 1,
    totalCount: 2,
    stamps: [
      {
        stampId: 'stamp-seoul',
        stampName: '서울',
        acquired: true,
        stampCount: 2,
        firstAcquiredAt: '2026-09-01T10:00:00',
      },
      {
        stampId: 'stamp-busan',
        stampName: '부산',
        acquired: false,
        stampCount: 0,
        firstAcquiredAt: null,
      },
    ],
  })
  vi.mocked(fetchPetOptions).mockResolvedValue(mockProfilePetOptions)
  vi.mocked(fetchMyPosts).mockResolvedValue(mockProfilePosts)
  vi.mocked(fetchPhotoDownload).mockResolvedValue({
    id: 'post-photo-id',
    downloadUrl: 'https://example.com/post-photo.jpg',
    takenAt: null,
  })
  vi.mocked(fetchBookmarks).mockResolvedValue([])
  vi.mocked(fetchWishlist).mockResolvedValue([])
  vi.mocked(fetchMyReviews).mockResolvedValue([])
  vi.mocked(fetchAlbumsByPet).mockResolvedValue([])
  vi.mocked(getProfileErrorMessage).mockReturnValue(
    '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'
  )
  vi.mocked(updateNickname).mockResolvedValue('새닉네임')
  vi.mocked(createPet).mockResolvedValue({ ...pet, id: 'new-pet-id', petName: '보리' })
  vi.mocked(updatePet).mockResolvedValue(pet)
  vi.mocked(updatePetPhoto).mockImplementation(async (_petId, photoId) => ({
    ...pet,
    profilePhoto: photoId
      ? { photoId, downloadUrl: 'https://example.com/pet-profile.jpg' }
      : null,
  }))
  vi.mocked(updateProfilePhoto).mockResolvedValue({
    photoId: 'photo-1',
    downloadUrl: 'https://example.com/profile.jpg',
  })
  vi.mocked(uploadPhotoFiles).mockResolvedValue([{
    uploadUrl: 'https://upload.example/profile',
    photoKey: 'profile/user/profile.jpg',
    fileName: 'profile.jpg',
  }])
  vi.mocked(savePhotos).mockResolvedValue([{
    id: 'photo-1',
    coursePlaceId: null,
    photoKey: 'profile/user/profile.jpg',
    takenAt: null,
    createdAt: null,
  }])
  vi.mocked(deletePet).mockResolvedValue()
  vi.mocked(removeBookmark).mockResolvedValue()
  vi.mocked(removeWishlistPlace).mockResolvedValue()
  vi.mocked(withdrawAccount).mockResolvedValue()
  vi.mocked(logout).mockResolvedValue()
})

afterEach(() => {
  cleanup()
  usePetStore.setState({ pets: [], selectedPetId: null })
  useAuthStore.setState({ status: 'authenticated', accessToken: 'test-token', sessionEpoch: 0 })
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
  })

  it('loads the mypage summary and pets from the profile API', async () => {
    render(<ProfileRoute />)

    expect(await screen.findByRole('heading', { name: '초코맘' })).toBeInTheDocument()
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('초코').length).toBeGreaterThan(0)
    expect(screen.queryByText('여행km')).not.toBeInTheDocument()
    expect(screen.queryByText('방문지')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /장소 위시리스트/ })).not.toBeInTheDocument()
    expect(fetchProfileSummary).toHaveBeenCalledOnce()
    expect(fetchPets).toHaveBeenCalledOnce()
    expect(fetchProfilePhoto).toHaveBeenCalledOnce()
  })

  it('uses the supplied default profile and uploads an iOS photo replacement', async () => {
    const user = userEvent.setup()
    render(<ProfileRoute />)

    const editButton = await screen.findByRole('button', { name: '프로필 사진 수정' })
    expect(screen.getByRole('img', { name: '프로필' })).toHaveAttribute('src', '/images/default-profile.svg')
    await user.click(editButton)
    expect(screen.getByRole('dialog', { name: '프로필 사진 수정' })).toBeInTheDocument()
    const input = screen.getByLabelText('새 프로필 사진 선택')
    expect(input).toHaveAttribute(
      'accept',
      '.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.avif,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif,image/x-heic,image/x-heif'
    )
    const file = new File(['profile'], 'profile.heic', { type: 'image/x-heic' })
    await user.upload(input, file)

    await waitFor(() => expect(uploadPhotoFiles).toHaveBeenCalledWith([file], 'PROFILE', expect.any(AbortSignal)))
    expect(savePhotos).toHaveBeenCalledWith(
      [{ photoKey: 'profile/user/profile.jpg' }],
      expect.any(AbortSignal)
    )
    expect(updateProfilePhoto).toHaveBeenCalledWith('photo-1', expect.any(AbortSignal))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '프로필 사진 수정' })).not.toBeInTheDocument())
    expect(screen.getByRole('img', { name: '프로필' })).toHaveAttribute('src', 'https://example.com/profile.jpg')
  })

  it('rejects an unsupported pet profile image before upload', async () => {
    const user = userEvent.setup()
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /반려동물 관리.*추가 · 수정 · 삭제/ }))
    await user.click(await screen.findByRole('button', { name: '초코 프로필 사진 등록' }))

    const input = screen.getByLabelText('초코 새 프로필 사진 선택')
    fireEvent.change(input, {
      target: { files: [new File(['svg'], 'illustration.svg', { type: 'image/svg+xml' })] },
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'JPG, PNG, WebP, GIF, HEIC, HEIF, AVIF 사진만 선택할 수 있어요.'
    )
    expect(uploadPhotoFiles).not.toHaveBeenCalled()
  })

  it('registers, replaces, and removes a pet profile photo', async () => {
    const user = userEvent.setup()
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /반려동물 관리.*추가 · 수정 · 삭제/ }))
    await user.click(await screen.findByRole('button', { name: '초코 프로필 사진 등록' }))

    expect(screen.getByRole('dialog', { name: '초코 프로필 사진 등록' })).toBeInTheDocument()
    const input = screen.getByLabelText('초코 새 프로필 사진 선택')
    expect(input).toHaveAttribute(
      'accept',
      '.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.avif,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif,image/x-heic,image/x-heif'
    )

    const file = new File(['profile'], 'pet.avif', { type: 'image/avif' })
    await user.upload(input, file)

    await waitFor(() =>
      expect(uploadPhotoFiles).toHaveBeenCalledWith(
        [file],
        'PROFILE',
        expect.any(AbortSignal)
      )
    )
    expect(savePhotos).toHaveBeenCalledWith(
      [{ photoKey: 'profile/user/profile.jpg' }],
      expect.any(AbortSignal)
    )
    expect(updatePetPhoto).toHaveBeenCalledWith(
      pet.id,
      'photo-1',
      expect.any(AbortSignal)
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '초코 프로필 사진 등록' })).not.toBeInTheDocument()
    )
    expect(screen.getByRole('img', { name: '초코 프로필 사진' })).toHaveAttribute(
      'src',
      'https://example.com/pet-profile.jpg'
    )

    await user.click(screen.getByRole('button', { name: '초코 프로필 사진 수정' }))
    await user.click(screen.getByRole('button', { name: '기본 프로필로 변경' }))
    await waitFor(() =>
      expect(updatePetPhoto).toHaveBeenLastCalledWith(
        pet.id,
        null,
        expect.any(AbortSignal)
      )
    )
    expect(uploadPhotoFiles).toHaveBeenCalledTimes(1)
  })

  it('stops the pet photo flow before saving when the auth session changes', async () => {
    const user = userEvent.setup()
    const uploadRequest = createDeferred<Awaited<ReturnType<typeof uploadPhotoFiles>>>()
    vi.mocked(uploadPhotoFiles).mockReturnValueOnce(uploadRequest.promise)
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /반려동물 관리.*추가 · 수정 · 삭제/ }))
    await user.click(await screen.findByRole('button', { name: '초코 프로필 사진 등록' }))
    await user.upload(
      screen.getByLabelText('초코 새 프로필 사진 선택'),
      new File(['profile'], 'pet.jpg', { type: 'image/jpeg' })
    )
    await waitFor(() => expect(uploadPhotoFiles).toHaveBeenCalledOnce())

    act(() => {
      useAuthStore.setState({ sessionEpoch: useAuthStore.getState().sessionEpoch + 1 })
    })
    await act(async () => {
      uploadRequest.resolve([{
        uploadUrl: 'https://upload.example/profile',
        photoKey: 'profile/user/profile.jpg',
        fileName: 'pet.jpg',
      }])
      await Promise.resolve()
    })

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(savePhotos).not.toHaveBeenCalled()
    expect(updatePetPhoto).not.toHaveBeenCalled()
  })

  it('shows three pets in the summary and combines the remaining count', async () => {
    vi.mocked(fetchProfileSummary).mockResolvedValue(mockProfileSummary)
    vi.mocked(fetchPets).mockResolvedValue(mockProfilePets)

    render(<ProfileRoute />)

    const petSummary = await screen.findByRole('region', { name: '나의 반려동물' })
    const summary = within(petSummary)
    const visiblePets = mockProfilePets.slice(0, 3)

    expect(summary.getByText(`총 ${mockProfilePets.length}마리`)).toBeInTheDocument()
    for (const profilePet of visiblePets) {
      expect(summary.getByText(profilePet.petName)).toBeInTheDocument()
    }
    expect(summary.queryByText(mockProfilePets[3].petName)).not.toBeInTheDocument()
    expect(
      summary.getByText(
        `${visiblePets.map((profilePet) => profilePet.petName).join(' · ')} 외 ${mockProfilePets.length - visiblePets.length}마리`
      )
    ).toBeInTheDocument()
    expect(summary.queryByRole('button')).not.toBeInTheDocument()
  })

  it('does not show a remaining count when exactly three pets are loaded', async () => {
    const threePets = mockProfilePets.slice(0, 3)
    vi.mocked(fetchProfileSummary).mockResolvedValue({
      ...mockProfileSummary,
      petCount: threePets.length,
    })
    vi.mocked(fetchPets).mockResolvedValue(threePets)

    render(<ProfileRoute />)

    const petSummary = await screen.findByRole('region', { name: '나의 반려동물' })
    const summary = within(petSummary)

    expect(summary.getByText('총 3마리')).toBeInTheDocument()
    expect(summary.queryByText(/외 \d+마리/)).not.toBeInTheDocument()
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
    expect(mockRouter.replace).toHaveBeenCalledWith('/my?section=posts', { scroll: false })
    const postLink = screen.getByRole('link', { name: `${mockProfilePosts[0].title} 게시글 보기` })
    expect(postLink).toHaveAttribute(
      'href', `/community?post=${encodeURIComponent(mockProfilePosts[0].id)}`
    )
    expect(postLink).toContainElement(screen.getByText(mockProfilePosts[0].title))
    expect(postLink).toContainElement(screen.getByText(mockProfilePosts[0].content))
    expect(within(postLink).getByText(`조회 ${mockProfilePosts[0].viewCount}`)).toBeInTheDocument()
  })

  it('restores the written-post settings panel from history route state', async () => {
    render(<ProfileRoute initialSettingsTab="posts" />)

    expect(await screen.findByRole('dialog', { name: '내정보 설정' })).toBeInTheDocument()
    expect(await screen.findByText(mockProfilePosts[0].title)).toBeInTheDocument()
    expect(fetchMyPosts).toHaveBeenCalledOnce()
  })

  it('loads a written post representative photo from its photo id', async () => {
    const user = userEvent.setup()
    const post = { ...mockProfilePosts[0], photoId: 'post-photo-id', photoUrl: null }
    vi.mocked(fetchMyPosts).mockResolvedValue([post])
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /작성한 글.*내 작성글 보기/ }))

    const image = await screen.findByRole('img', { name: `${post.title} 대표 사진` })
    expect(image).toHaveAttribute('src', 'https://example.com/post-photo.jpg')
    expect(fetchPhotoDownload).toHaveBeenCalledWith('post-photo-id', expect.any(AbortSignal))
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
        name: /반려동물 관리.*추가 · 수정 · 삭제/,
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

  it('loads the regional stamp book with achieved and unachieved artwork', async () => {
    const user = userEvent.setup()
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /스탬프.*17개 지역 도감/ }))

    expect(await screen.findByRole('heading', { name: '지역 스탬프' })).toBeInTheDocument()
    expect(fetchStampCollection).toHaveBeenCalledWith(expect.any(AbortSignal))
    expect(screen.getByRole('progressbar', { name: '스탬프 수집률' })).toHaveAttribute(
      'aria-valuenow',
      '1'
    )
    expect(screen.getByRole('img', { name: '서울 스탬프 획득' })).toHaveAttribute(
      'src',
      '/stamps/achieved/seoul.png'
    )
    expect(screen.getByRole('img', { name: '부산 스탬프 미획득' })).toHaveAttribute(
      'src',
      '/stamps/unachieved/busan.png'
    )
    expect(screen.getByText('2회 방문')).toBeInTheDocument()
    expect(screen.getByText('미획득')).toBeInTheDocument()
    expect(screen.getByText('2026. 9. 1.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }))
    expect(await screen.findByRole('heading', { name: '초코맘' })).toBeInTheDocument()
  })

  it('retries the stamp collection after an API failure', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchStampCollection)
      .mockRejectedValueOnce({ type: 'network' })
      .mockResolvedValueOnce({ acquiredCount: 0, totalCount: 0, stamps: [] })
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /스탬프.*17개 지역 도감/ }))
    expect(await screen.findByRole('heading', { name: '스탬프를 불러오지 못했어요' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다시 불러오기' }))
    expect(await screen.findByText('아직 등록된 지역 스탬프가 없어요.')).toBeInTheDocument()
    expect(fetchStampCollection).toHaveBeenCalledTimes(2)
  })

  it('shows only deceased pets and opens their documented pet album list', async () => {
    const livingPet = { ...pet, id: 'living-pet', petName: '초코', isDie: false }
    const memoryPet = { ...pet, id: 'memory-pet', petName: '별이', isDie: true }
    vi.mocked(fetchPets).mockResolvedValue([livingPet, memoryPet])
    vi.mocked(fetchAlbumsByPet).mockResolvedValue([{
      courseId: 'memory-course',
      travelDate: '2026-08-01',
      petId: 'memory-pet',
      photos: [{
        photoId: 'memory-photo',
        downloadUrl: '/images/album-cover.png',
        takenAt: '2026-08-01',
        externalPlaceId: null,
        isPublic: false,
      }],
    }])
    const user = userEvent.setup()
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /추억 앨범.*1마리의 추억/ }))

    expect(await screen.findByRole('button', { name: '별이의 추억 앨범 보기' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '초코의 추억 앨범 보기' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '별이의 추억 앨범 보기' }))
    expect(await screen.findByText('별이와 함께한 여행')).toBeInTheDocument()
    expect(screen.getByText('별이의 추억 앨범')).toBeInTheDocument()
    expect(fetchAlbumsByPet).toHaveBeenCalledWith('memory-pet', expect.any(AbortSignal))
  })

  it('shows an empty memory album state and returns to mypage', async () => {
    const user = userEvent.setup()
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /추억 앨범.*0마리의 추억/ }))
    expect(await screen.findByText('아직 추억 앨범이 없어요')).toBeInTheDocument()
    expect(screen.getByText(/추억으로 등록된 반려동물/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }))
    expect(await screen.findByRole('heading', { name: '초코맘' })).toBeInTheDocument()
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
      expect(screen.getByRole('link', { name: bookmark.title })).toHaveAttribute(
        'href', `/community?post=${encodeURIComponent(bookmark.id)}`
      )
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
    await user.click(screen.getByRole('button', { name: /반려동물 관리.*추가 · 수정 · 삭제/ }))
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
    await user.click(screen.getByRole('button', { name: /반려동물 관리.*추가 · 수정 · 삭제/ }))
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
    await user.click(screen.getByRole('button', { name: /반려동물 관리.*추가 · 수정 · 삭제/ }))
    await user.click(await screen.findByRole('button', { name: '초코 삭제' }))
    const deleteButton = screen.getByRole('button', { name: /완전히 삭제하기/ })
    await user.click(deleteButton)
    expect(deleteButton).toBeDisabled()
    const memoryButton = screen.getByRole('button', { name: /추억으로 보관하기/ })
    expect(memoryButton).toBeDisabled()
    await user.click(memoryButton)
    expect(screen.getByRole('dialog', { name: '초코 삭제' })).toBeInTheDocument()
    await user.click(deleteButton)
    expect(deletePet).toHaveBeenCalledOnce()

    resolveDelete?.()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '초코 삭제' })).not.toBeInTheDocument())
  })

  it('cancels a pending editor when deletion opens and never stacks both modals', async () => {
    const user = userEvent.setup()
    const options = createDeferred<typeof mockProfilePetOptions>()
    vi.mocked(fetchPetOptions).mockReturnValueOnce(options.promise)
    render(<><ProfileRoute /><nav data-bottom-nav aria-label="하단 메뉴"><button>다른 화면</button></nav></>)
    const nav = screen.getByRole('navigation')
    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /반려동물 관리.*추가 · 수정 · 삭제/ }))
    await user.click(await screen.findByRole('button', { name: '초코 수정' }))
    await screen.findByText('견종과 활동 정보를 불러오는 중...')
    await user.click(screen.getByRole('button', { name: '초코 삭제' }))
    expect(vi.mocked(fetchPetOptions).mock.calls[0][0]?.aborted).toBe(true)
    await act(async () => options.resolve(mockProfilePetOptions))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: '초코 삭제' })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('반려견 이름')).not.toBeInTheDocument()
    expect(nav).toHaveAttribute('inert')
    await user.click(screen.getByRole('button', { name: '취소' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(nav).not.toHaveAttribute('inert')
    expect(nav).not.toHaveAttribute('aria-hidden')
  })

  it('restores background isolation after replacing an open editor with deletion', async () => {
    const user = userEvent.setup()
    render(<><ProfileRoute /><nav data-bottom-nav aria-label="하단 메뉴"><button>다른 화면</button></nav></>)
    const nav = screen.getByRole('navigation')
    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /반려동물 관리.*추가 · 수정 · 삭제/ }))
    await user.click(await screen.findByRole('button', { name: '초코 수정' }))
    expect(await screen.findByRole('dialog', { name: '반려견 정보 수정' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '초코 삭제', hidden: true }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: '초코 삭제' })).toBeInTheDocument()
    expect(nav).toHaveAttribute('inert')

    await user.click(screen.getByRole('button', { name: '취소' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(nav).not.toHaveAttribute('inert')
      expect(nav).not.toHaveAttribute('aria-hidden')
    })
  })

  it('requires explicit breed and age values before pet registration', async () => {
    const user = userEvent.setup()
    render(<ProfileRoute />)

    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /반려동물 관리.*추가 · 수정 · 삭제/ }))
    await user.click(await screen.findByRole('button', { name: '반려동물 추가하기' }))
    await user.type(await screen.findByPlaceholderText('반려견 이름'), '보리')

    expect(screen.getByRole('button', { name: '저장하기' })).toBeDisabled()
    expect(screen.getByLabelText('견종')).toHaveValue('')
  })

  it.each(['create', 'update', 'delete', 'withdraw'] as const)(
    'isolates navigation and background during the %s dialog and restores them on exit',
    async (operation) => {
      const user = userEvent.setup()
      render(<><ProfileRoute /><nav data-bottom-nav aria-label="하단 메뉴"><button>다른 화면</button></nav></>)
      const nav = screen.getByRole('navigation')
      await screen.findByRole('heading', { name: '초코맘' })
      if (operation !== 'withdraw') {
        await user.click(screen.getByRole('button', { name: /반려동물 관리.*추가 · 수정 · 삭제/ }))
      }
      const trigger = await screen.findByRole('button', {
        name: operation === 'create' ? '반려동물 추가하기' : operation === 'update' ? '초코 수정' : operation === 'delete' ? '초코 삭제' : '회원 탈퇴',
      })
      await user.click(trigger)
      const dialog = await screen.findByRole('dialog')
      expect(dialog).toHaveFocus()
      expect(nav).toHaveAttribute('inert')
      expect(nav).toHaveAttribute('aria-hidden', 'true')
      expect(trigger.closest('[inert]')).not.toBeNull()
      await user.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(nav).not.toHaveAttribute('inert')
        expect(nav).not.toHaveAttribute('aria-hidden')
        expect(trigger).toHaveFocus()
      })
    }
  )

  it.each([
    ['create', 'unmount'], ['create', 'session'],
    ['update', 'unmount'], ['update', 'session'],
    ['delete', 'unmount'], ['delete', 'session'],
  ] as const)('ignores a late pet %s result after %s', async (operation, change) => {
    const user = userEvent.setup()
    const request = createDeferred<typeof pet>()
    const deletion = createDeferred<void>()
    if (operation === 'create') vi.mocked(createPet).mockReturnValueOnce(request.promise)
    if (operation === 'update') vi.mocked(updatePet).mockReturnValueOnce(request.promise)
    if (operation === 'delete') vi.mocked(deletePet).mockReturnValueOnce(deletion.promise)
    const { unmount } = render(<ProfileRoute />)
    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /반려동물 관리.*추가 · 수정 · 삭제/ }))
    await user.click(await screen.findByRole('button', {
      name: operation === 'create' ? '반려동물 추가하기' : operation === 'update' ? '초코 수정' : '초코 삭제',
    }))
    if (operation === 'create') {
      await user.type(await screen.findByPlaceholderText('반려견 이름'), '보리')
      await user.selectOptions(screen.getByLabelText('견종'), '7')
      await user.type(screen.getByPlaceholderText('3'), '2')
    }
    await user.click(await screen.findByRole('button', {
      name: operation === 'delete' ? /완전히 삭제하기/ : '저장하기',
    }))
    expect(operation === 'create' ? createPet : operation === 'update' ? updatePet : deletePet).toHaveBeenCalledOnce()
    const newSessionPets = [{ ...pet, petName: '새 세션 반려견' }]
    await act(async () => {
      if (change === 'unmount') unmount()
      else useAuthStore.setState({ sessionEpoch: useAuthStore.getState().sessionEpoch + 1 })
      usePetStore.setState({ pets: newSessionPets })
      request.resolve({ ...pet, petName: '이전 요청 결과' })
      deletion.resolve()
      await Promise.resolve()
    })
    expect(usePetStore.getState().pets).toEqual(newSessionPets)
  })

  it('does not log out a new session when an earlier withdrawal finishes', async () => {
    const user = userEvent.setup()
    const request = createDeferred<void>()
    vi.mocked(withdrawAccount).mockReturnValueOnce(request.promise)
    render(<ProfileRoute />)
    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))
    await user.click(screen.getByRole('button', { name: '위 내용을 확인했습니다' }))
    await user.click(screen.getByRole('button', { name: '탈퇴하기' }))
    await act(async () => {
      useAuthStore.setState({ sessionEpoch: useAuthStore.getState().sessionEpoch + 1 })
      request.resolve()
    })
    expect(logout).not.toHaveBeenCalled()
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })

  it('does not redirect or clear pets from a new session after a delayed logout', async () => {
    const user = userEvent.setup()
    const request = createDeferred<void>()
    vi.mocked(logout).mockReturnValueOnce(request.promise)
    render(<ProfileRoute />)
    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: '로그아웃' }))
    const newSessionPets = [{ ...pet, petName: '새 세션 반려견' }]
    await act(async () => {
      useAuthStore.setState({ sessionEpoch: useAuthStore.getState().sessionEpoch + 1 })
      usePetStore.setState({ pets: newSessionPets })
      request.resolve()
    })
    expect(mockRouter.replace).not.toHaveBeenCalled()
    expect(usePetStore.getState().pets).toEqual(newSessionPets)
  })

  it('serializes bookmark removal, retains failed rows and removes only confirmed rows', async () => {
    const user = userEvent.setup()
    const request = createDeferred<void>()
    vi.mocked(fetchBookmarks).mockResolvedValue(mockProfileBookmarks.slice(0, 2))
    const remove = vi.mocked(removeBookmark)
    remove.mockRejectedValueOnce(new Error('failed')).mockReturnValueOnce(request.promise)
    render(<ProfileRoute />)
    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /북마크.*저장한 게시글 보기/ }))
    const label = (index: number) => `${mockProfileBookmarks[index].title} 북마크 해제`
    const first = await screen.findByRole('button', { name: label(0) })
    const second = screen.getByRole('button', { name: label(1) })
    await user.click(first)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(first).toBeEnabled()
    await user.click(first)
    expect(first).toBeDisabled()
    expect(second).toBeDisabled()
    await user.click(second)
    expect(remove).toHaveBeenCalledTimes(2)
    await act(async () => request.resolve())
    await waitFor(() => expect(screen.queryByRole('button', { name: label(0) })).not.toBeInTheDocument())
    expect(second).toBeEnabled()
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
    expect(mockRouter.replace).toHaveBeenLastCalledWith('/my', { scroll: false })
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '내정보 설정' })).not.toBeInTheDocument()
      expect(settingsTrigger).toHaveFocus()
    })
  })
  it('includes post links in the settings keyboard loop and encodes the post ID', async () => {
    const posts = [
      { ...mockProfilePosts[0], id: 'post/with?query&value', title: '첫 번째 글' },
      { ...mockProfilePosts[0], id: 'second-post', title: '두 번째 글' },
    ]
    vi.mocked(fetchMyPosts).mockResolvedValue(posts)
    const user = userEvent.setup()
    render(<ProfileRoute />)
    await screen.findByRole('heading', { name: '초코맘' })
    await user.click(screen.getByRole('button', { name: /작성한 글.*내 작성글 보기/ }))
    const firstLink = await screen.findByRole('link', { name: `${posts[0].title} 게시글 보기` })
    const lastLink = screen.getByRole('link', { name: `${posts[1].title} 게시글 보기` })
    const back = screen.getByRole('button', { name: '뒤로 가기' })
    expect(firstLink).toHaveAttribute('href', '/community?post=post%2Fwith%3Fquery%26value')
    expect(back).toHaveFocus()
    await user.tab()
    expect(within(screen.getByRole('dialog', { name: '내정보 설정' }))
      .getByRole('button', { name: /알림/ })).toHaveFocus()
    await user.tab()
    expect(firstLink).toHaveFocus()
    await user.tab()
    expect(lastLink).toHaveFocus()
    await user.tab()
    expect(back).toHaveFocus()
    await user.tab({ shift: true })
    expect(lastLink).toHaveFocus()
  })
})
