import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TripEndScreen from '@/components/screens/trip-end-screen'

const course = {
  id: 'course-1',
  travelDate: '2026-09-16',
  startLocation: '서울역',
  endLocation: '서울숲',
  places: [
    {
      id: 'course-place-1', externalPlaceId: 'place-1', name: '성수 펫 카페',
      imageUrl: null, latitude: 37.5, longitude: 127, visitOrder: 1,
      isFinal: false, petPolicy: null,
    },
    {
      id: 'course-place-2', externalPlaceId: 'place-2', name: '서울숲 공원',
      imageUrl: null, latitude: 37.6, longitude: 127.1, visitOrder: 2,
      isFinal: true, petPolicy: null,
    },
  ],
}

const noteDrafts = [
  {
    waypointId: 'course-place-1', content: '카페 후기', rating: 5, photoUrls: [],
    photos: [{ photoId: 'photo-1', downloadUrl: '/images/place-cafe.png', takenAt: '2026-09-16' }],
  },
  {
    waypointId: 'course-place-2', content: '공원 후기', rating: 4, photoUrls: [],
    photos: [{ photoId: 'photo-2', downloadUrl: '/images/place-park.png', takenAt: '2026-09-16' }],
  },
]

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(navigator, 'share')
})

describe('TripEndScreen travel summary', () => {
  it('shows route, weather, date, and lets route photos choose the album cover', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <TripEndScreen
        course={course}
        noteDrafts={noteDrafts}
        weather={{ weatherStatus: '맑음', temperature: 24, humidity: 55 }}
        onSave={onSave}
        onShare={vi.fn()}
      />
    )

    expect(screen.getByText('서울역 → 서울숲')).toBeInTheDocument()
    expect(screen.queryByText('성수 펫 카페 · 서울숲 공원')).not.toBeInTheDocument()
    expect(screen.getByText('2026.09.16')).toBeInTheDocument()
    expect(screen.getByText('맑음')).toBeInTheDocument()
    expect(screen.getByText('24°C')).toBeInTheDocument()
    expect(screen.getByText('습도 55%')).toBeInTheDocument()
    expect(screen.getByText('경로별 후기')).toBeInTheDocument()
    expect(screen.getByText('카페 후기')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '성수 펫 카페 여행 사진' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '서울숲 공원 여행 사진' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: '앨범 대표 사진 선택' })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '서울숲 공원 사진을 앨범 대표 사진으로 선택' }))
    await user.type(
      screen.getByPlaceholderText('오늘 여행을 어떠셨나요? 소중한 기억을 기록해보세요...'),
      '오늘의 전체 후기'
    )
    await user.click(screen.getByRole('button', { name: '앨범에 저장하기' }))

    expect(onSave).toHaveBeenCalledWith('오늘의 전체 후기', 'photo-2')
    expect(screen.queryByText('장소별 여행 노트')).not.toBeInTheDocument()
  })

  it('allows the completed trip title to be edited before sharing', async () => {
    const user = userEvent.setup()
    const onShare = vi.fn()

    render(
      <TripEndScreen
        course={course}
        petName="골든이"
        onSave={vi.fn()}
        onShare={onShare}
      />
    )

    expect(screen.getByRole('img', { name: '여행 대표 사진' }).getAttribute('src')).toContain(
      'album-default-cover.png'
    )
    const titleInput = screen.getByRole('textbox', { name: '여행 제목' })
    await user.clear(titleInput)
    await user.type(titleInput, '우리의 서울숲 산책')
    await user.type(
      screen.getByPlaceholderText('오늘 여행을 어떠셨나요? 소중한 기억을 기록해보세요...'),
      '다시 오고 싶은 하루였어요.'
    )
    await user.click(screen.getByRole('button', { name: '게시판 공유' }))

    expect(onShare).toHaveBeenCalledWith('다시 오고 싶은 하루였어요.', null, '우리의 서울숲 산책')
  })

  it('passes the overall review to the board share flow', async () => {
    const user = userEvent.setup()
    const onShare = vi.fn()

    render(<TripEndScreen onSave={vi.fn()} onShare={onShare} />)

    const shareButton = screen.getByRole('button', { name: '게시판 공유' })
    expect(shareButton).toBeDisabled()

    await user.type(
      screen.getByPlaceholderText('오늘 여행을 어떠셨나요? 소중한 기억을 기록해보세요...'),
      '골든이와 함께해서 즐거운 여행이었어요.'
    )

    expect(shareButton).toBeEnabled()
    await user.click(shareButton)

    expect(onShare).toHaveBeenCalledWith('골든이와 함께해서 즐거운 여행이었어요.', null, '반려동물와의 여행')
  })

  it('uses the generated default title when the edited title is blank', async () => {
    const user = userEvent.setup()
    const onShare = vi.fn()

    render(<TripEndScreen course={course} petName="골든이" onSave={vi.fn()} onShare={onShare} />)

    const titleInput = screen.getByRole('textbox', { name: '여행 제목' })
    await user.clear(titleInput)
    await user.type(titleInput, '   ')
    await user.type(
      screen.getByPlaceholderText('오늘 여행을 어떠셨나요? 소중한 기억을 기록해보세요...'),
      '공유할 여행 일기'
    )
    await user.click(screen.getByRole('button', { name: '게시판 공유' }))

    expect(onShare).toHaveBeenCalledWith('공유할 여행 일기', null, '골든이와의 서울숲 여행')
    expect(titleInput).toHaveValue('골든이와의 서울숲 여행')
  })

  it('disables board sharing after the trip has already been shared', () => {
    render(
      <TripEndScreen
        initialReview="이미 공유한 여행이에요."
        isBoardShared
        onSave={vi.fn()}
        onShare={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: '게시판 공유 완료' })).toBeDisabled()
  })

  it('shares the redesigned SNS course card through the native share sheet', async () => {
    const user = userEvent.setup()
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    })

    render(<TripEndScreen course={course} petName="골든이" weather={{ weatherStatus: '맑음' }} initialReview="함께라서 즐거웠어요." onSave={vi.fn()} onShare={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'SNS 카드' }))
    const dialog = screen.getByRole('dialog', { name: 'SNS 코스 카드' })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText(/경유지 · 성수 펫 카페 · 서울숲 공원/)).toBeInTheDocument()
    expect(within(dialog).getByText('골든이')).toBeInTheDocument()
    expect(within(dialog).getByText('맑음')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다른 앱으로 공유' }))

    await waitFor(() => {
      expect(share).toHaveBeenCalledWith(expect.objectContaining({
        title: '골든이와의 서울숲 여행',
        text: expect.stringContaining('함께라서 즐거웠어요.'),
      }))
    })
    expect(await screen.findByRole('status')).toHaveTextContent('공유할 앱을 선택했어요.')
  })
})
