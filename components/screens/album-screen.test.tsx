import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import AlbumScreen from '@/components/screens/album-screen'

afterEach(() => cleanup())

describe('AlbumScreen', () => {
  it('shows an honest empty state without rendering local album mock data', () => {
    render(<AlbumScreen />)

    expect(screen.getByText('아직 여행 기록이 없어요')).toBeInTheDocument()
    expect(screen.getByText('반려동물과 첫 여행을 떠나볼까요?')).toBeInTheDocument()
    expect(screen.queryByText('골든이와 서울 성수 여행')).not.toBeInTheDocument()
    expect(screen.queryByText('제주 올레길 코스')).not.toBeInTheDocument()
    expect(screen.queryByText('가평 자라섬 캠핑 여행')).not.toBeInTheDocument()
  })
})
