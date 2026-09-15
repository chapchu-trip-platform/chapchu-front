import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AlbumScreen from '@/components/screens/album-screen'
import { fetchAlbumDetail, fetchMyAlbums } from '@/features/album/api/albums-api'
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
  }],
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AlbumScreen', () => {
  it('renders the server album list and loads its actual course detail', async () => {
    vi.mocked(fetchMyAlbums).mockResolvedValue([album])
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
    expect(screen.getByText('산책하기 좋았어요.')).toBeInTheDocument()
  })
})
