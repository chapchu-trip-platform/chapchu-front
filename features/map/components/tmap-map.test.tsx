import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TmapMap from '@/features/map/components/tmap-map'

vi.mock('@/lib/load-tmap-sdk', () => ({
  loadTmapSdk: vi.fn(() => new Promise(() => {})),
}))

describe('TmapMap', () => {
  it('renders a loading state while the SDK is loading', () => {
    render(<TmapMap />)

    expect(screen.getByText('지도를 불러오는 중입니다')).toBeInTheDocument()
    expect(screen.getByTestId('tmap-container')).toBeInTheDocument()
  })
})
