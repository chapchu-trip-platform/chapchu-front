import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MapSetupScreen from '@/components/screens/map-setup-screen'
import { searchLocations } from '@/features/location/api/location-search-api'

vi.mock('@/features/location/api/location-search-api', () => ({
  searchLocations: vi.fn(),
}))

vi.mock('@/features/map/components/tmap-map', () => ({
  default: ({ locationLabel }: { locationLabel: string }) => (
    <div aria-label="지도 미리보기">{locationLabel}</div>
  ),
}))

describe('MapSetupScreen location search', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.mocked(searchLocations).mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('uses only the custom clear buttons without native search cancel controls', () => {
    render(
      <MapSetupScreen
        onBack={vi.fn()}
        onNext={vi.fn()}
        initialOrigin={{
          id: 'origin',
          name: '서울역',
          address: '서울 용산구 한강대로 405',
          latitude: 37.5547,
          longitude: 126.9706,
        }}
        initialDestination={{
          id: 'destination',
          name: '서울숲',
          address: '서울 성동구 뚝섬로 273',
          latitude: 37.5444,
          longitude: 127.0374,
        }}
        locationStatus="idle"
      />
    )

    expect(screen.getByRole('searchbox', { name: '출발지' })).toHaveAttribute(
      'type',
      'text'
    )
    expect(screen.getByRole('searchbox', { name: '도착지' })).toHaveAttribute(
      'type',
      'text'
    )
    expect(screen.getByRole('button', { name: '출발지 지우기' })).toBeVisible()
    expect(screen.getByRole('button', { name: '도착지 지우기' })).toBeVisible()
  })

  it('requires a selected result and submits both endpoint coordinates', async () => {
    const user = userEvent.setup()
    const onNext = vi.fn()
    const destination = {
      id: 'poi-1',
      name: '서울숲',
      address: '서울 성동구 뚝섬로 273',
      latitude: 37.5444,
      longitude: 127.0374,
    }
    vi.mocked(searchLocations).mockResolvedValue([destination])

    render(
      <MapSetupScreen
        onBack={vi.fn()}
        onNext={onNext}
        currentLocation={{ lat: 37.5, lng: 127 }}
        locationStatus="success"
      />
    )

    await user.click(screen.getByRole('button', { name: '현재 위치 사용' }))
    await user.type(screen.getByRole('searchbox', { name: '도착지' }), '서울숲')

    await waitFor(() => {
      expect(searchLocations).toHaveBeenCalledWith(
        '서울숲',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    })
    await user.click(await screen.findByRole('button', { name: /서울숲/ }))
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(onNext).toHaveBeenCalledWith(
      {
        id: 'current-location',
        name: '현재 위치',
        address: '기기에서 확인한 현재 위치',
        latitude: 37.5,
        longitude: 127,
      },
      destination
    )
  })

  it('does not accept free text that was not selected from results', async () => {
    const user = userEvent.setup()

    render(
      <MapSetupScreen
        onBack={vi.fn()}
        onNext={vi.fn()}
        currentLocation={{ lat: 37.5, lng: 127 }}
        locationStatus="success"
      />
    )

    await user.click(screen.getByRole('button', { name: '현재 위치 사용' }))
    await user.type(screen.getByRole('searchbox', { name: '도착지' }), '없는 장소')

    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  it('keeps search results inside a fixed flex viewport', async () => {
    const user = userEvent.setup()
    vi.mocked(searchLocations).mockResolvedValue(
      Array.from({ length: 10 }, (_, index) => ({
        id: `poi-${index}`,
        name: `서울 장소 ${index + 1}`,
        address: `서울 주소 ${index + 1}`,
        latitude: 37.5 + index * 0.001,
        longitude: 127 + index * 0.001,
      }))
    )

    render(
      <MapSetupScreen
        onBack={vi.fn()}
        onNext={vi.fn()}
        locationStatus="idle"
      />
    )

    await user.type(screen.getByRole('searchbox', { name: '출발지' }), '서울')
    expect(await screen.findByRole('button', { name: /서울 장소 10/ })).toBeVisible()

    expect(screen.getByTestId('location-search-viewport')).toHaveClass(
      'h-0',
      'min-h-52',
      'flex-1',
      'overflow-hidden'
    )
    const lastSearchResult = screen.getByRole('button', { name: /서울 장소 10/ })

    expect(lastSearchResult.parentElement).toHaveClass('overflow-y-auto')
    expect(lastSearchResult).toHaveClass(
      'transition-[background-color,filter]',
      'hover:bg-muted/50',
      'hover:brightness-[0.97]',
      'active:bg-muted',
      'focus-visible:bg-muted/50'
    )
  })
})
