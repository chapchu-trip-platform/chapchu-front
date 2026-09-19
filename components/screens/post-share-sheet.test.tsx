import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PostShareSheet from '@/components/screens/post-share-sheet'

afterEach(cleanup)

describe('PostShareSheet', () => {
  it('slides up without a duplicate review field and shares the overall review', async () => {
    const user = userEvent.setup()
    const onShare = vi.fn()
    const onClose = vi.fn()

    render(
      <PostShareSheet
        onClose={onClose}
        onShare={onShare}
        tripTitle="골든이와의 서울 성수 여행"
        photos={[{
          photoId: 'photo-1',
          downloadUrl: '/images/album-cover.png',
          placeName: '서울숲',
        }]}
        initialPhotoId="photo-1"
        petName="골든이"
        tripReview="여행 종료 화면에서 작성한 전체 후기"
      />
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass(
      'slide-up',
      'drop-shadow-[0_-10px_24px_rgba(58,47,42,0.18)]'
    )
    expect(dialog).not.toHaveClass('max-h-[85vh]', 'rounded-t-[28px]')
    expect(dialog.firstElementChild).toHaveClass(
      'max-h-[85vh]',
      'rounded-t-[28px]',
      '[clip-path:inset(0_round_28px_28px_0_0)]'
    )
    expect(dialog).not.toHaveClass('border', 'ring-1')
    expect(dialog.previousElementSibling).toHaveClass('absolute', 'inset-0', 'bg-black/25')
    expect(dialog.previousElementSibling).not.toHaveClass('backdrop-blur-sm')
    expect(document.querySelector('textarea')).toBeNull()
    expect(screen.getByRole('radiogroup', { name: '게시판 대표 사진 선택' })).toHaveClass('flex', 'overflow-x-auto')
    expect(screen.getByRole('radio', { name: '서울숲 사진을 게시판 대표 사진으로 선택' })).toHaveClass('size-24', 'shrink-0')

    await user.click(screen.getByRole('button', { name: '공유하기' }))

    await waitFor(
      () =>
        expect(onShare).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '골든이와의 서울 성수 여행',
            content: '여행 종료 화면에서 작성한 전체 후기',
            image: '/images/album-cover.png',
          })
        ),
      { timeout: 1500 }
    )
    expect(screen.getByRole('button', { name: '공유 완료' })).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()

    await waitFor(() => expect(dialog.previousElementSibling).toHaveClass('bg-transparent'), {
      timeout: 1000,
    })
    await waitFor(() => expect(dialog).toHaveClass('translate-y-full', 'duration-[320ms]'))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce(), { timeout: 800 })
  })

  it('slides down before closing from the X button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <PostShareSheet
        onClose={onClose}
        onShare={vi.fn()}
        tripTitle="골든이와의 서울 성수 여행"
        photos={[]}
        petName="골든이"
        tripReview="전체 후기"
      />
    )

    await user.click(screen.getByRole('button', { name: '공유 창 닫기' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog.previousElementSibling).toHaveClass('bg-transparent')
    expect(dialog).not.toHaveClass('translate-y-full')
    expect(onClose).not.toHaveBeenCalled()

    await waitFor(() => expect(dialog).toHaveClass('translate-y-full', 'duration-[320ms]'))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce(), { timeout: 800 })
  })

  it('allows sharing a post without selecting a representative photo', async () => {
    const user = userEvent.setup()
    const onShare = vi.fn()

    render(
      <PostShareSheet
        onClose={vi.fn()}
        onShare={onShare}
        tripTitle="사진 없는 여행"
        photos={[{
          photoId: 'photo-1',
          downloadUrl: '/images/album-cover.png',
          placeName: '서울숲',
        }]}
        initialPhotoId="photo-1"
        petName="골든이"
        tripReview="사진 없이 공유할 후기"
      />
    )

    await user.click(screen.getByRole('button', { name: '사진 없이 공유' }))
    await user.click(screen.getByRole('button', { name: '공유하기' }))

    await waitFor(() => {
      expect(onShare).toHaveBeenCalledWith(expect.objectContaining({ image: null }))
    })
  })

  it('uses the dedicated travel review layout with route context', () => {
    render(
      <PostShareSheet
        onClose={vi.fn()}
        onShare={vi.fn()}
        tripTitle="서울숲 산책 기록"
        photos={[]}
        petName="골든이"
        tripReview="코스 전체 후기"
        variant="travel-review"
        course={{
          id: 'course-1',
          travelDate: '2026-09-16',
          startLocation: '서울역',
          endLocation: '서울숲',
          places: [{
            id: 'place-1', externalPlaceId: 'external-1', name: '성수 펫 카페', imageUrl: null,
            latitude: 37.5, longitude: 127, visitOrder: 1, isFinal: false, petPolicy: null,
          }],
        }}
        weather={{ weatherStatus: '맑음' }}
      />
    )

    expect(screen.getByRole('heading', { name: '여행 리뷰 게시판에 공유' })).toBeInTheDocument()
    expect(screen.getByText('서울역 → 서울숲')).toBeInTheDocument()
    expect(screen.getByText('성수 펫 카페')).toBeInTheDocument()
    expect(screen.getByText('여행 리뷰 전용 게시글')).toBeInTheDocument()
    expect(screen.queryByText('함께한 반려동물')).not.toBeInTheDocument()
  })
})
