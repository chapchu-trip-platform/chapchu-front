import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotificationButton } from '@/components/ui/notification-button'

afterEach(cleanup)

describe('NotificationButton', () => {
  it('announces unread notifications without showing a count', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<NotificationButton hasUnread onClick={onClick} />)

    const button = screen.getByRole('button', { name: '알림, 읽지 않은 알림 있음' })
    const indicator = button.querySelector('[data-state="unread"]')

    await user.click(button)

    expect(indicator).toHaveClass('bg-soft-orange')
    expect(screen.queryByText(/\d/)).not.toBeInTheDocument()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('keeps a neutral badge when there are no unread notifications', () => {
    render(<NotificationButton />)

    const button = screen.getByRole('button', { name: '알림' })
    const indicator = button.querySelector('[data-state="empty"]')

    expect(indicator).toHaveClass('bg-card-surface', 'ring-border')
    expect(indicator).not.toHaveClass('bg-soft-orange')
  })
})
