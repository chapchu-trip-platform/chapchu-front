import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BottomNav from '@/components/layout/bottom-nav'

afterEach(cleanup)

describe('BottomNav', () => {
  it('links every navigation item to its screen', () => {
    render(<BottomNav active="profile" />)

    expect(screen.getByRole('link', { name: '홈' })).toHaveAttribute('href', '/home')
    expect(screen.getByRole('link', { name: '게시판' })).toHaveAttribute('href', '/community')
    expect(screen.getByRole('link', { name: '지도' })).toHaveAttribute('href', '/map')
    expect(screen.getByRole('link', { name: '앨범' })).toHaveAttribute('href', '/album')
    expect(screen.getByRole('link', { name: '내정보' })).toHaveAttribute('href', '/my')
    expect(screen.getByRole('link', { name: '내정보' })).toHaveAttribute('aria-current', 'page')
  })

  it('handles an active tab reselect without navigating away', async () => {
    const user = userEvent.setup()
    const onReselect = vi.fn()
    render(<BottomNav active="album" onReselect={onReselect} />)

    await user.click(screen.getByRole('link', { name: '앨범' }))

    expect(onReselect).toHaveBeenCalledWith('album')
  })
})
