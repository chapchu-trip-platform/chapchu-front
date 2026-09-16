import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AlbumScreen from '@/components/screens/album-screen'
import { fetchAlbumDetail, fetchMyAlbums } from '@/features/album/api/albums-api'
import { fetchMyPosts } from '@/features/community/api/community-api'
import { fetchSelectablePets } from '@/features/profile/api/pets-api'

vi.mock('@/features/album/api/albums-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/album/api/albums-api')>()
  return {
    ...actual,
    fetchMyAlbums: vi.fn(),
    fetchAlbumDetail: vi.fn(),
  }
})

vi.mock('@/features/profile/api/pets-api', () => ({
  fetchSelectablePets: vi.fn(),
}))

vi.mock('@/features/community/api/community-api', () => ({
  fetchMyPosts: vi.fn(),
}))

const album = {
  courseId: 'course-1',
  travelDate: '2026-09-15',
  petId: 'pet-1',
  photos: [{
    photoId: 'photo-1',
    downloadUrl: '/images/album-cover.png',
    takenAt: '2026-09-15',
    externalPlaceId: 'place-1',
    isPublic: false,
  }, {
    photoId: 'photo-2',
    downloadUrl: '/images/place-park.png',
    takenAt: '2026-09-15',
    externalPlaceId: 'place-1',
    isPublic: true,
  }, {
    photoId: 'photo-3',
    downloadUrl: '/images/place-cafe.png',
    takenAt: '2026-09-15',
    externalPlaceId: 'place-1',
    isPublic: true,
  }, {
    photoId: 'photo-4',
    downloadUrl: '/images/place-restaurant.png',
    takenAt: '2026-09-15',
    externalPlaceId: 'place-1',
    isPublic: false,
  }],
}

beforeEach(() => {
  vi.mocked(fetchMyPosts).mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AlbumScreen', () => {
  it('uses the generated album cover when a saved album has no photos', async () => {
    const photoLessAlbum = { ...album, photos: [] }
    vi.mocked(fetchMyAlbums).mockResolvedValue([photoLessAlbum])
    vi.mocked(fetchSelectablePets).mockResolvedValue([{ id: 'pet-1', name: '초코' }])
    vi.mocked(fetchAlbumDetail).mockResolvedValue({
      summary: photoLessAlbum,
      course: {
        id: 'course-1',
        travelDate: '2026-09-15',
        startLocation: '서울역',
        endLocation: '서울숲',
        places: [{
          id: 'course-place-1',
          externalPlaceId: 'place-1',
          name: '서울숲',
          imageUrl: '/images/place-park.png',
          latitude: 37.5,
          longitude: 127,
          visitOrder: 1,
          isFinal: true,
          petPolicy: null,
        }],
      },
      stops: [{
        coursePlaceId: 'course-place-1',
        externalPlaceId: 'place-1',
        placeName: '서울숲',
        visitOrder: 1,
        imageUrl: '/images/place-park.png',
        review: null,
        photos: [],
      }],
    })
    const user = userEvent.setup()

    render(<AlbumScreen />)

    const albumCover = await screen.findByRole('img', { name: '초코 여행 앨범' })
    expect(albumCover.getAttribute('src')).toContain('album-default-cover.png')

    await user.click(screen.getByText('초코와 함께한 여행'))
    const detailCover = await screen.findByRole('img', { name: '초코와의 서울숲 여행' })
    expect(detailCover.getAttribute('src')).toContain('album-default-cover.png')
    expect(detailCover.getAttribute('src')).not.toContain('place-park.png')
  })

  it('renders the server album list and loads its actual course detail', async () => {
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    vi.mocked(fetchMyAlbums).mockResolvedValue([album])
    vi.mocked(fetchMyPosts).mockResolvedValue([{
      id: 'post-1', petId: 'pet-1', photoId: null, courseId: 'course-1',
      title: '초코와의 여행', content: '게시판에 등록된 최종 여행 일기', nickname: '보호자',
      authorProfilePhotoUrl: null, photoUrl: null, photos: [], viewCount: 0,
      recommendationCount: 0, recommended: false, bookmarked: false,
      commentCount: 0, createdAt: '2026-09-15T12:00:00Z', category: 'TRAVEL_REVIEW',
    }])
    vi.mocked(fetchSelectablePets).mockResolvedValue([{ id: 'pet-1', name: '초코' }])
    vi.mocked(fetchAlbumDetail).mockResolvedValue({
      summary: album,
      course: {
        id: 'course-1',
        travelDate: '2026-09-15',
        startLocation: '서울역',
        endLocation: '서울숲',
        places: [{
          id: 'course-place-1',
          externalPlaceId: 'place-1',
          name: '서울숲',
          imageUrl: null,
          latitude: 37.5,
          longitude: 127,
          visitOrder: 1,
          isFinal: true,
          petPolicy: null,
        }],
      },
      stops: [{
        coursePlaceId: 'course-place-1',
        externalPlaceId: 'place-1',
        placeName: '서울숲',
        visitOrder: 1,
        imageUrl: null,
        review: {
          reviewId: 'review-1',
          rating: 5,
          contents: '산책하기 좋았어요.',
          weather: 'SUNNY',
          createdAt: '2026-09-15T12:00:00',
        },
        photos: album.photos,
      }],
    })
    const user = userEvent.setup()

    render(<AlbumScreen />)

    expect(await screen.findByText('초코와 함께한 여행')).toBeInTheDocument()
    expect(fetchMyAlbums).toHaveBeenCalledWith(expect.any(AbortSignal))
    await user.click(screen.getByText('초코와 함께한 여행'))

    await waitFor(() => expect(fetchAlbumDetail).toHaveBeenCalledWith(album, expect.any(AbortSignal)))
    expect(await screen.findByText('초코와의 서울숲 여행')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '앨범 상세 내용' })).toHaveClass(
      'min-h-0',
      'overflow-y-auto',
      'pb-16'
    )
    await waitFor(() => expect(screen.getByRole('region', { name: '여행 완료 일기' })).toHaveTextContent('게시판에 등록된 최종 여행 일기'))
    expect(fetchMyPosts).toHaveBeenCalledWith(expect.any(AbortSignal))
    const emptyDiary = screen.getByRole('region', { name: '여행 완료 일기' })
    expect(emptyDiary).toBeInTheDocument()
    expect(emptyDiary.querySelector('p')).toHaveTextContent('게시판에 등록된 최종 여행 일기')
    expect(screen.getByLabelText('여행 정보')).toHaveTextContent('함께한 반려견초코')
    expect(screen.getByLabelText('여행 정보')).toHaveTextContent('여행 날짜2026.09.15')
    expect(screen.getByLabelText('여행 정보')).toHaveTextContent('당시 날씨맑음')
    expect(screen.getByRole('heading', { name: '이동 흐름' })).toBeInTheDocument()
    expect(screen.getByText('서울역')).toBeInTheDocument()
    expect(screen.getByText('도착')).toBeInTheDocument()
    expect(screen.queryByText('산책하기 좋았어요.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('서울숲에서 촬영한 사진 4장')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '서울숲 사진 1' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '서울숲 사진 2' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '서울숲 사진 3' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '서울숲 사진 4' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '사진 1장 더 보기' }))
    expect(screen.getByRole('img', { name: '서울숲 사진 4' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '사진 접기' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '서울숲 사진 2 자세히 보기' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('2 / 4')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '사진 확대' }))
    expect(within(dialog).getByText('150%')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '전체 화면 닫기' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(historyBack).toHaveBeenCalledOnce()
    historyBack.mockRestore()
  })
})
