import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import CommunityScreen from '@/features/community/components/community-demo-screen'

afterEach(cleanup)

describe('CommunityScreen', () => {
  it('shows detailed pet information and every place in a travel review route', () => {
    render(<CommunityScreen initialPostId="1" />)

    expect(screen.getByText('봄이')).toBeInTheDocument()
    expect(screen.getByText('견종 · 비글')).toBeInTheDocument()
    expect(screen.getByText('중형견')).toBeInTheDocument()
    expect(screen.getByText('4살')).toBeInTheDocument()

    const route = screen.getByRole('list', { name: '제주 올레 7코스 경유 장소' })
    expect(within(route).getAllByRole('listitem')).toHaveLength(4)
    expect(within(route).getByText('제주올레 여행자센터')).toBeInTheDocument()
    expect(within(route).getByText('법환포구')).toBeInTheDocument()
    expect(within(route).getByText('월평포구')).toBeInTheDocument()
    expect(within(route).getByText('월평 아왜낭목 쉼터')).toBeInTheDocument()
  })

  it('hides companion cards on free posts and uses bookmarking instead of sharing', async () => {
    const user = userEvent.setup()
    render(<CommunityScreen initialPostId="3" />)
    expect(screen.queryByText('동행 반려동물')).not.toBeInTheDocument()
    expect(screen.queryByText('코스 정보')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '공유' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '북마크' }))
    expect(screen.getByRole('button', { name: '북마크 취소' })).toHaveAttribute('aria-pressed', 'true')
  })
})
