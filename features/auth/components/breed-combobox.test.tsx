import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BreedCombobox } from '@/features/auth/components/breed-combobox'

const breeds = [
  { id: 7, name: '골든리트리버' },
  { id: 31, name: '비글' },
  { id: 157, name: '믹스견' },
]

afterEach(cleanup)

describe('BreedCombobox', () => {
  it('renders a custom searchable combobox instead of a native select', () => {
    const { container } = render(
      <BreedCombobox breeds={breeds} value={null} onChange={vi.fn()} />
    )

    expect(screen.getByRole('combobox', { name: '견종' })).toBeInTheDocument()
    expect(container.querySelector('select')).not.toBeInTheDocument()
  })

  it('filters Korean breed names and selects a result', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BreedCombobox breeds={breeds} value={null} onChange={onChange} />)

    const input = screen.getByRole('combobox', { name: '견종' })
    await user.type(input, '골든')

    expect(screen.getByRole('option', { name: '골든리트리버' })).toBeVisible()
    expect(screen.queryByRole('option', { name: '믹스견' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('option', { name: '골든리트리버' }))

    expect(onChange).toHaveBeenLastCalledWith(7)
    expect(input).toHaveValue('골든리트리버')
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it('clears the selected breed when its displayed name is edited', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BreedCombobox breeds={breeds} value={7} onChange={onChange} />)

    const input = screen.getByRole('combobox', { name: '견종' })
    await user.type(input, '변경')

    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(screen.getByText('일치하는 견종이 없어요.')).toBeVisible()
  })

  it('supports keyboard navigation and selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BreedCombobox breeds={breeds} value={null} onChange={onChange} />)

    const input = screen.getByRole('combobox', { name: '견종' })
    await user.type(input, '믹')
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenLastCalledWith(157)
    expect(input).toHaveValue('믹스견')
  })
})
