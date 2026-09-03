import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TripEndScreen from '@/components/screens/trip-end-screen'

afterEach(cleanup)

describe('TripEndScreen waypoint notes', () => {
  it('keeps each expanded review in its own labelled panel', async () => {
    const user = userEvent.setup()

    render(<TripEndScreen onSave={vi.fn()} onShare={vi.fn()} />)

    const firstTrigger = screen.getByRole('button', { name: /성수 펫 카페/ })
    const secondTrigger = screen.getByRole('button', { name: /서울숲 공원/ })

    expect(firstTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(firstTrigger).toHaveAttribute('aria-controls', 'waypoint-note-panel-0')
    expect(document.querySelector('#waypoint-note-panel-0')).toHaveTextContent(
      '골든이가 물그릇을 정말 좋아했어요!'
    )

    await user.click(secondTrigger)

    expect(secondTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(document.querySelector('#waypoint-note-panel-1')).toHaveTextContent(
      '넓은 잔디밭에서 맘껏 뛰어놀았어요.'
    )
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

    expect(onShare).toHaveBeenCalledWith('골든이와 함께해서 즐거운 여행이었어요.')
  })
})
