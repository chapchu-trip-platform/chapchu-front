import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TravelProgressScreen from '@/components/screens/travel-progress-screen'
import { completeCourse } from '@/features/travel/api/course-completion-api'
import { visitCoursePlace } from '@/features/travel/api/course-place-visit-api'
import { uploadCoursePlacePhotos } from '@/features/travel/api/travel-photos-api'
import { useTravelStore } from '@/features/travel/stores/travel-store'

const locationMocks = vi.hoisted(() => ({
  getPosition: vi.fn(() => ({
    latitude: 35.1595,
    longitude: 129.0756,
    accuracyMeters: 15,
    capturedAt: '2026-09-12T05:00:00.000Z',
    precision: 'precise',
    source: 'web',
  }) as {
    latitude: number
    longitude: number
    accuracyMeters: number
    capturedAt: string
    precision: string
    source: string
  } | null),
  refreshLocation: vi.fn().mockResolvedValue({
    latitude: 37.5444,
    longitude: 127.0374,
  }),
  cancelLocationRequest: vi.fn(),
}))

vi.mock('@/features/location/stores/location-store', () => ({
  useLocationStore: (selector: (state: unknown) => unknown) => selector({
    position: locationMocks.getPosition(),
    status: 'success',
    refreshLocation: locationMocks.refreshLocation,
    cancelLocationRequest: locationMocks.cancelLocationRequest,
  }),
}))

vi.mock('@/features/map/components/tmap-map', () => ({
  default: ({ markers, recenterOnCenterChange }: { markers: Array<{ id: string; title: string }>; recenterOnCenterChange?: boolean }) => (
    <div data-testid="tmap-map" data-recenter={String(recenterOnCenterChange)}>{markers.map((marker) => <span key={marker.id}>{marker.title}</span>)}</div>
  ),
}))

vi.mock('@/features/travel/api/course-place-visit-api', () => ({
  visitCoursePlace: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/features/travel/api/course-completion-api', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/features/travel/api/course-completion-api')
  >()
  return {
    ...actual,
    completeCourse: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('@/features/travel/api/travel-photos-api', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/features/travel/api/travel-photos-api')
  >()
  return {
    ...actual,
    uploadCoursePlacePhotos: vi.fn().mockResolvedValue([
      {
        photoId: 'photo-1',
        downloadUrl: '/images/place-cafe.png',
        takenAt: '2026-09-12',
      },
    ]),
  }
})

const course = {
  id: 'course-1',
  travelDate: '2026-09-12',
  startLocation: '서울역',
  endLocation: '서울숲',
  places: [
    {
      id: 'course-place-1',
      externalPlaceId: 'place-1',
      name: '성수 펫 카페',
      imageUrl: null,
      latitude: 37.5444,
      longitude: 127.0374,
      visitOrder: 1,
      isFinal: false,
      petPolicy: null,
    },
    {
      id: 'course-place-2',
      externalPlaceId: 'place-2',
      name: '서울숲 공원',
      imageUrl: null,
      latitude: 37.5465,
      longitude: 127.0377,
      visitOrder: 2,
      isFinal: true,
      petPolicy: null,
    },
  ],
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  locationMocks.getPosition.mockReturnValue({
    latitude: 35.1595,
    longitude: 129.0756,
    accuracyMeters: 15,
    capturedAt: '2026-09-12T05:00:00.000Z',
    precision: 'precise',
    source: 'web',
  })
  useTravelStore.getState().resetTravel()
  localStorage.clear()
})

describe('TravelProgressScreen', () => {
  it('temporarily uses the place coordinates so remote QA check-in is allowed', async () => {
    const user = userEvent.setup()
    render(<TravelProgressScreen course={course} petName="골든이" onEndTrip={vi.fn()} onAbort={vi.fn()} />)

    expect(screen.getByText('서울역 → 서울숲')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' })).toBeInTheDocument()
    expect(screen.getByTestId('tmap-map')).toHaveTextContent('현재 위치')
    expect(screen.getByTestId('tmap-map')).toHaveAttribute('data-recenter', 'false')

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' }))

    await waitFor(() => {
      expect(visitCoursePlace).toHaveBeenCalledWith(
        'course-place-1',
        expect.objectContaining({ latitude: 37.5444, longitude: 127.0374 }),
        expect.any(AbortSignal)
      )
    })
    expect(screen.getByRole('button', { name: '서울숲 공원 방문 체크인' })).toBeInTheDocument()
    expect(screen.getByText('방문 1 · 생략 0')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '성수 펫 카페 후기 펼치기' })).toBeInTheDocument()
  })

  it('shows a visit failure in an alert dialog', async () => {
    const user = userEvent.setup()
    vi.mocked(visitCoursePlace).mockRejectedValueOnce({ type: 'network' })
    render(<TravelProgressScreen course={course} petName="골든이" onEndTrip={vi.fn()} onAbort={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' }))

    const dialog = await screen.findByRole('alertdialog', { name: '방문 인증에 실패했어요' })
    expect(dialog).toHaveTextContent('네트워크 연결을 확인하고 다시 시도해주세요.')
    expect(screen.queryByText('네트워크 연결을 확인하고 다시 시도해주세요.', { selector: 'p[role="alert"]' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '확인' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('expands every destination card and writes its review inline', async () => {
    const user = userEvent.setup()
    render(<TravelProgressScreen course={course} petName="골든이" onEndTrip={vi.fn()} onAbort={vi.fn()} />)

    const reviewPanel = document.querySelector(
      '#travel-place-review-course-place-1'
    ) as HTMLElement
    expect(reviewPanel).toHaveAttribute('aria-hidden', 'true')
    expect(reviewPanel).toHaveClass('grid-rows-[0fr]', 'opacity-0')

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 후기 펼치기' }))

    expect(screen.getByRole('region', { name: '성수 펫 카페 후기 작성' })).toBe(reviewPanel)
    expect(reviewPanel).toHaveAttribute('aria-hidden', 'false')
    expect(reviewPanel).toHaveClass('grid-rows-[1fr]', 'opacity-100', 'duration-300')
    expect(reviewPanel.closest('article')).toHaveClass('bg-sage-green-light/50')
    expect(reviewPanel.querySelector('.border-t')).not.toHaveClass('bg-card-surface')
    const reviewInput = screen.getByRole('textbox', { name: '성수 펫 카페 간단 후기' })
    expect(reviewInput).toBeDisabled()
    expect(screen.getAllByText('방문 인증 후 작성 가능')).toHaveLength(2)
    expect(screen.getByRole('button', { name: '후기 저장' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' }))

    await waitFor(() => expect(reviewInput).toBeEnabled())
    await user.type(reviewInput, '함께 쉬기 좋았어요.')
    await user.click(screen.getByRole('button', { name: '성수 펫 카페 5점' }))
    await user.click(screen.getByRole('button', { name: '후기 저장' }))

    expect(screen.getByRole('button', { name: '저장 완료' })).toBeInTheDocument()
    expect(screen.getByText('후기 저장됨')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '서울숲 공원 후기 펼치기' })).toBeInTheDocument()
    expect(screen.queryByText('현재 위치 연결됨')).not.toBeInTheDocument()
    expect(screen.queryByText('500m 이내에서 체크인')).not.toBeInTheDocument()
    expect(screen.getByText('여행을 그만 진행할까요?')).toBeInTheDocument()
  })

  it('keeps check-in usable when the device location is unavailable', async () => {
    const user = userEvent.setup()
    locationMocks.getPosition.mockReturnValue(null)

    render(<TravelProgressScreen course={course} petName="골든이" onEndTrip={vi.fn()} onAbort={vi.fn()} />)

    expect(screen.getByText('위치 없이 진행 가능')).toBeInTheDocument()
    expect(screen.getAllByText(/거리 정보 없음/)).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' }))

    await waitFor(() => {
      expect(visitCoursePlace).toHaveBeenCalledWith(
        'course-place-1',
        expect.objectContaining({ latitude: 37.5444, longitude: 127.0374 }),
        expect.any(AbortSignal)
      )
    })
    expect(screen.getByRole('button', { name: '서울숲 공원 방문 체크인' })).toBeInTheDocument()
  })

  it('skips a visit without granting review or photo access and moves to the next place', async () => {
    const user = userEvent.setup()
    render(<TravelProgressScreen course={course} petName="골든이" onEndTrip={vi.fn()} onAbort={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '생략' }))
    const dialog = screen.getByRole('alertdialog', {
      name: '성수 펫 카페 방문을 생략할까요?',
    })
    expect(dialog).toHaveTextContent('후기와 사진은 등록할 수 없어요')

    await user.click(screen.getByRole('button', { name: '방문 생략' }))

    expect(visitCoursePlace).not.toHaveBeenCalled()
    expect(useTravelStore.getState().skippedPlaceIds).toEqual(['course-place-1'])
    expect(useTravelStore.getState().visitedPlaceIds).toEqual([])
    expect(screen.getByRole('button', { name: '서울숲 공원 방문 체크인' })).toBeInTheDocument()
    expect(screen.getByText('방문 0 · 생략 1')).toBeInTheDocument()
    expect(screen.getByText('방문 생략')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 후기 펼치기' }))
    expect(screen.getByRole('textbox', { name: '성수 펫 카페 간단 후기' })).toBeDisabled()
    expect(screen.getByText('방문 생략한 장소')).toBeInTheDocument()
  })

  it('uploads selected travel photos and caches their server IDs', async () => {
    const user = userEvent.setup()
    render(<TravelProgressScreen course={course} petName="골든이" onEndTrip={vi.fn()} onAbort={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 후기 펼치기' }))
    const file = new File(['image'], '산책.jpg', { type: 'image/jpeg' })
    const photoInput = screen.getByLabelText('성수 펫 카페 사진 추가')
    expect(photoInput).toBeDisabled()
    await user.upload(photoInput, file)
    expect(uploadCoursePlacePhotos).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' }))
    await waitFor(() => expect(photoInput).toBeEnabled())
    await user.upload(photoInput, file)

    await waitFor(() => {
      expect(uploadCoursePlacePhotos).toHaveBeenCalledWith(
        'course-place-1',
        [file],
        expect.any(AbortSignal)
      )
    })
    expect(await screen.findByText('여행 사진에 추가했어요.')).toBeInTheDocument()
    expect(useTravelStore.getState().noteDrafts[0].photos?.[0].photoId).toBe('photo-1')

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 여행 사진 삭제' }))
    expect(useTravelStore.getState().noteDrafts[0].photos).toEqual([])
  })

  it('uses the same fixed dock and expandable detail sheet as the earlier map screens', async () => {
    const user = userEvent.setup()
    render(<TravelProgressScreen course={course} petName="골든이" onEndTrip={vi.fn()} onAbort={vi.fn()} />)

    const dock = screen.getByTestId('travel-progress-dock')
    expect(dock).toHaveClass('h-[156px]', 'min-h-[156px]')
    expect(dock).toHaveTextContent('서울역 → 서울숲')
    expect(dock).toHaveTextContent('진행 중')
    expect(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' })).toHaveClass('flex-1')
    expect(screen.getByRole('button', { name: '생략' }).parentElement).toHaveClass(
      'map-flow-dock-actions'
    )

    const handle = screen.getByRole('button', { name: '여행 진행 상세 펼치기' })
    const sheet = document.querySelector('#travel-details-sheet') as HTMLDivElement
    expect(sheet).toHaveClass('map-flow-detail-sheet')
    expect(handle).toHaveAttribute('aria-expanded', 'false')
    expect(sheet).toHaveStyle({
      transform: 'translate3d(0, calc(100% - 32px), 0)',
    })

    await user.click(handle)
    expect(screen.getByRole('button', { name: '여행 진행 상세 접기' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(sheet).toHaveStyle({ transform: 'translate3d(0, 0, 0)' })
  })

  it('follows an upward drag and completes the trip from the fixed action button', async () => {
    const user = userEvent.setup()
    const onEndTrip = vi.fn()
    render(<TravelProgressScreen course={course} petName="골든이" onEndTrip={onEndTrip} onAbort={vi.fn()} />)

    const handle = screen.getByRole('button', { name: '여행 진행 상세 펼치기' })
    const sheet = document.querySelector('#travel-details-sheet') as HTMLDivElement
    vi.spyOn(sheet, 'getBoundingClientRect').mockReturnValue({
      bottom: 600,
      height: 500,
      left: 0,
      right: 430,
      top: 100,
      width: 430,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    })

    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 500 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 350 })
    expect(sheet).toHaveStyle({ transform: 'translate3d(0, 318px, 0)' })
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 350 })
    expect(sheet).toHaveStyle({ transform: 'translate3d(0, 0, 0)' })

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' }))
    await user.click(await screen.findByRole('button', { name: '서울숲 공원 방문 체크인' }))
    const completeButton = await screen.findByRole('button', { name: '여행 완료' })
    expect(completeButton).toHaveClass('map-flow-dock-button')

    await user.click(completeButton)
    expect(onEndTrip).toHaveBeenCalledOnce()
  })

  it('completes the server course before leaving an aborted trip', async () => {
    const user = userEvent.setup()
    const onAbort = vi.fn()
    render(
      <TravelProgressScreen
        course={course}
        petName="골든이"
        onEndTrip={vi.fn()}
        onAbort={onAbort}
      />
    )

    await user.click(screen.getByRole('button', { name: '중도 종료' }))
    await user.click(screen.getAllByRole('button', { name: '중도 종료' }).at(-1)!)

    await waitFor(() => {
      expect(completeCourse).toHaveBeenCalledWith(
        'course-1',
        expect.any(AbortSignal)
      )
    })
    expect(onAbort).toHaveBeenCalledOnce()
  })

  it('keeps the trip open when server completion fails', async () => {
    const user = userEvent.setup()
    const onAbort = vi.fn()
    vi.mocked(completeCourse).mockRejectedValueOnce({ type: 'network' })
    render(
      <TravelProgressScreen
        course={course}
        petName="골든이"
        onEndTrip={vi.fn()}
        onAbort={onAbort}
      />
    )

    await user.click(screen.getByRole('button', { name: '중도 종료' }))
    await user.click(screen.getAllByRole('button', { name: '중도 종료' }).at(-1)!)

    expect(await screen.findByRole('alert')).toHaveTextContent('네트워크')
    expect(onAbort).not.toHaveBeenCalled()
  })
})
