import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PhotoImage } from '@/components/common/photo-image'
import { fetchPhotoDownload } from '@/features/photos/api/photo-api'

vi.mock('@/features/photos/api/photo-api', () => ({
  fetchPhotoDownload: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PhotoImage', () => {
  it('refreshes an expired signed URL once when a photo id is available', async () => {
    vi.mocked(fetchPhotoDownload).mockResolvedValue({
      id: 'photo-1',
      downloadUrl: 'https://bucket.example/refreshed.jpg?signature=new',
      takenAt: null,
    })
    render(
      <PhotoImage
        src="https://bucket.example/expired.jpg?signature=old"
        photoId="photo-1"
        alt="반려견 프로필"
        fallbackSrc="/images/dog-hero.png"
      />
    )

    fireEvent.error(screen.getByRole('img', { name: '반려견 프로필' }))

    await waitFor(() =>
      expect(fetchPhotoDownload).toHaveBeenCalledWith('photo-1', expect.any(AbortSignal))
    )
    expect(screen.getByRole('img', { name: '반려견 프로필' })).toHaveAttribute(
      'src',
      'https://bucket.example/refreshed.jpg?signature=new'
    )
  })

  it('uses the fallback when refreshing an expired URL fails', async () => {
    vi.mocked(fetchPhotoDownload).mockRejectedValue(new Error('expired'))
    render(
      <PhotoImage
        src="https://bucket.example/expired.jpg?signature=old"
        photoId="photo-1"
        alt="반려견 프로필"
        fallbackSrc="/images/dog-hero.png"
        fallbackAlt="기본 반려견 프로필"
      />
    )

    fireEvent.error(screen.getByRole('img', { name: '반려견 프로필' }))

    expect(await screen.findByRole('img', { name: '기본 반려견 프로필' })).toHaveAttribute(
      'src',
      '/images/dog-hero.png'
    )
    expect(fetchPhotoDownload).toHaveBeenCalledOnce()
  })
})
