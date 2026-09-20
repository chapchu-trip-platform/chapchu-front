import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TravelProgressScreen from '@/components/screens/travel-progress-screen'
import { deleteCourse } from '@/features/travel/api/course-deletion-api'
import { uploadCoursePlacePhotoBatch } from '@/features/travel/api/travel-photos-api'
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

vi.mock('@/features/travel/api/course-deletion-api', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/features/travel/api/course-deletion-api')
  >()
  return {
    ...actual,
    deleteCourse: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('@/features/travel/api/travel-photos-api', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/features/travel/api/travel-photos-api')
  >()
  return {
    ...actual,
    uploadCoursePlacePhotoBatch: vi.fn().mockResolvedValue([{
      coursePlaceId: 'course-place-1',
      photos: [
      {
        photoId: 'photo-1',
        downloadUrl: '/images/place-cafe.png',
        takenAt: '2026-09-12',
      },
      ],
    }]),
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
  it('stores visit check-ins in the frontend cache', async () => {
    const user = userEvent.setup()
    render(<TravelProgressScreen course={course} petName="골든이" onEndTrip={vi.fn()} onAbort={vi.fn()} />)

    expect(screen.getByText('서울역 → 서울숲')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' })).toBeInTheDocument()
    expect(screen.getByTestId('tmap-map')).toHaveTextContent('현재 위치')
    expect(screen.getByTestId('tmap-map')).toHaveAttribute('data-recenter', 'false')

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' }))

    expect(useTravelStore.getState().visitedPlaceIds).toEqual(['course-place-1'])
    expect(JSON.parse(localStorage.getItem('chapchu.travel-drafts') ?? 'null')).toEqual(
      expect.objectContaining({ visitedPlaceIds: ['course-place-1'] })
    )
    expect(screen.getByRole('button', { name: '서울숲 공원 방문 체크인' })).toBeInTheDocument()
    expect(screen.getByText('방문 1 / 전체 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '성수 펫 카페 후기 펼치기' })).toBeInTheDocument()
  })

  it('uses the same frontend check-in for the final destination', async () => {
    const user = userEvent.setup()
    render(<TravelProgressScreen course={course} petName="골든이" onEndTrip={vi.fn()} onAbort={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' }))
    await user.click(await screen.findByRole('button', { name: '서울숲 공원 방문 체크인' }))

    expect(useTravelStore.getState().visitedPlaceIds).toEqual([
      'course-place-1',
      'course-place-2',
    ])
    expect(screen.getByRole('button', { name: '여행 완료' })).toBeInTheDocument()
  })

  it('checks in a manual final destination without an external place ID', async () => {
    const user = userEvent.setup()
    const courseWithManualDestination = {
      ...course,
      places: course.places.map((place) =>
        place.isFinal ? { ...place, externalPlaceId: '' } : place
      ),
    }
    render(
      <TravelProgressScreen
        course={courseWithManualDestination}
        petName="골든이"
        onEndTrip={vi.fn()}
        onAbort={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' }))
    await user.click(await screen.findByRole('button', { name: '서울숲 공원 방문 체크인' }))

    await waitFor(() => {
      expect(useTravelStore.getState().visitedPlaceIds).toEqual([
        'course-place-1',
        'course-place-2',
      ])
    })
    expect(screen.getByRole('button', { name: '여행 완료' })).toBeInTheDocument()
  })

  it('enables reviews after check-in and saves review input to frontend memory immediately', async () => {
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
    expect(screen.queryByText('입력 즉시 메모리에 저장돼요')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' }))

    await waitFor(() => expect(reviewInput).toBeEnabled())
    await user.type(reviewInput, '함께 쉬기 좋았어요.')
    await user.click(screen.getByRole('button', { name: '성수 펫 카페 5점' }))

    expect(screen.getByText('입력 즉시 메모리에 저장돼요')).toBeInTheDocument()
    expect(screen.getByText('메모리 저장됨')).toBeInTheDocument()
    expect(useTravelStore.getState().noteDrafts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        waypointId: 'course-place-1',
        content: '함께 쉬기 좋았어요.',
        rating: 5,
        saved: true,
      }),
    ]))
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

    expect(useTravelStore.getState().visitedPlaceIds).toEqual(['course-place-1'])
    expect(screen.getByRole('button', { name: '서울숲 공원 방문 체크인' })).toBeInTheDocument()
  })

  it('does not allow skipping and only completes after every place is visited', async () => {
    const user = userEvent.setup()
    render(<TravelProgressScreen course={course} petName="골든이" onEndTrip={vi.fn()} onAbort={vi.fn()} />)

    expect(screen.queryByRole('button', { name: '생략' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '여행 완료' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' }))

    expect(useTravelStore.getState().visitedPlaceIds).toEqual(['course-place-1'])
    expect(screen.getByRole('button', { name: '서울숲 공원 방문 체크인' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '여행 완료' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '서울숲 공원 방문 체크인' }))
    expect(await screen.findByRole('button', { name: '여행 완료' })).toBeInTheDocument()
  })

  it('keeps selected photos in memory and uploads them once when the trip ends', async () => {
    const user = userEvent.setup()
    const onEndTrip = vi.fn()
    render(<TravelProgressScreen course={course} petName="골든이" onEndTrip={onEndTrip} onAbort={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 후기 펼치기' }))
    const file = new File(['image'], '산책.jpg', { type: 'image/jpeg' })
    const photoInput = screen.getByLabelText('성수 펫 카페 사진 추가')
    expect(photoInput).toBeDisabled()
    await user.upload(photoInput, file)
    expect(uploadCoursePlacePhotoBatch).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' }))
    await waitFor(() => expect(photoInput).toBeEnabled())
    await user.upload(photoInput, file)

    expect(
      await screen.findByText('여행 완료 전까지 프론트 메모리에 임시 저장돼요.')
    ).toBeInTheDocument()
    expect(uploadCoursePlacePhotoBatch).not.toHaveBeenCalled()
    expect(useTravelStore.getState().noteDrafts[0]?.photos).toBeUndefined()

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 여행 사진 삭제' }))
    expect(screen.queryByRole('button', { name: '성수 펫 카페 여행 사진 삭제' })).not.toBeInTheDocument()

    await user.upload(photoInput, file)
    await user.click(screen.getByRole('button', { name: '서울숲 공원 방문 체크인' }))
    await user.click(await screen.findByRole('button', { name: '여행 완료' }))

    await waitFor(() => {
      expect(uploadCoursePlacePhotoBatch).toHaveBeenCalledWith(
        [{ coursePlaceId: 'course-place-1', files: [file] }],
        expect.any(AbortSignal)
      )
    })
    expect(useTravelStore.getState().noteDrafts[0].photos?.[0].photoId).toBe('photo-1')
    expect(onEndTrip).toHaveBeenCalledOnce()
  })

  it('keeps the trip open with the in-memory photos when final upload fails', async () => {
    const user = userEvent.setup()
    const onEndTrip = vi.fn()
    vi.mocked(uploadCoursePlacePhotoBatch).mockRejectedValueOnce({ type: 'network' })
    render(
      <TravelProgressScreen
        course={course}
        petName="골든이"
        onEndTrip={onEndTrip}
        onAbort={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' }))
    await user.click(screen.getByRole('button', { name: '성수 펫 카페 후기 펼치기' }))
    const file = new File(['image'], '산책.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('성수 펫 카페 사진 추가'), file)
    await user.click(screen.getByRole('button', { name: '서울숲 공원 방문 체크인' }))
    await user.click(await screen.findByRole('button', { name: '여행 완료' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('네트워크')
    expect(screen.getByRole('button', { name: '성수 펫 카페 여행 사진 삭제' })).toBeInTheDocument()
    expect(onEndTrip).not.toHaveBeenCalled()
  })

  it('uses the same fixed dock and expandable detail sheet as the earlier map screens', async () => {
    const user = userEvent.setup()
    render(<TravelProgressScreen course={course} petName="골든이" onEndTrip={vi.fn()} onAbort={vi.fn()} />)

    const dock = screen.getByTestId('travel-progress-dock')
    expect(dock).toHaveClass('h-[156px]', 'min-h-[156px]')
    expect(dock).toHaveTextContent('서울역 → 서울숲')
    expect(dock).toHaveTextContent('진행 중')
    expect(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' })).toHaveClass(
      'flex-1',
      'map-flow-dock-button'
    )
    expect(screen.getByRole('button', { name: '성수 펫 카페 방문 체크인' }).parentElement).toHaveClass(
      'map-flow-dock-actions'
    )
    expect(screen.queryByRole('button', { name: '생략' })).not.toBeInTheDocument()

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

  it('shows a back notice and leaves the course active for later resumption', async () => {
    const user = userEvent.setup()
    const onAbort = vi.fn()
    const onLeave = vi.fn()
    render(
      <TravelProgressScreen
        course={course}
        petName="골든이"
        onEndTrip={vi.fn()}
        onAbort={onAbort}
        onLeave={onLeave}
      />
    )

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }))
    const dialog = screen.getByRole('dialog', { name: '홈으로 이동할까요?' })
    expect(dialog).toHaveTextContent('지도 페이지를 다시 열면 이어서 진행할 수 있어요')
    await user.click(screen.getByRole('button', { name: '홈으로 이동' }))

    expect(onLeave).toHaveBeenCalledOnce()
    expect(onAbort).not.toHaveBeenCalled()
    expect(deleteCourse).not.toHaveBeenCalled()
  })

  it('deletes the server course before leaving an aborted trip', async () => {
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
    expect(screen.getByRole('alertdialog', { name: '여행을 중도 종료할까요?' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: '중도 종료' }).at(-1)!)

    await waitFor(() => {
      expect(deleteCourse).toHaveBeenCalledWith(
        'course-1',
        expect.any(AbortSignal)
      )
    })
    expect(onAbort).toHaveBeenCalledOnce()
  })

  it('keeps the trip open when server deletion fails', async () => {
    const user = userEvent.setup()
    const onAbort = vi.fn()
    vi.mocked(deleteCourse).mockRejectedValueOnce({ type: 'network' })
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
