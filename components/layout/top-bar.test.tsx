import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import TopBar from '@/components/layout/top-bar'

afterEach(cleanup)

describe('TopBar', () => {
  it('stays fixed at the top and reserves its layout space', () => {
    const { container } = render(<TopBar title="게시판" />)

    const topBar = screen.getByRole('banner')
    const spacer = container.querySelector('[aria-hidden="true"]')

    expect(topBar).toHaveClass('fixed', 'top-0', 'max-w-[430px]')
    expect(spacer).toHaveClass('h-14', 'flex-shrink-0')
    expect(screen.queryByRole('button', { name: /알림/ })).not.toBeInTheDocument()
  })

  it('renders only an explicitly provided right action', () => {
    render(<TopBar title="게시판" rightAction={<button type="button">글쓰기</button>} />)

    expect(screen.getByRole('button', { name: '글쓰기' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /알림/ })).not.toBeInTheDocument()
  })
})
