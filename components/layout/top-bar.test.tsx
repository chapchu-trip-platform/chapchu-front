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
  })
})
