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
})
