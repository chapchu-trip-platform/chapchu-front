import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SignupScreen from '@/components/screens/signup-screen'

afterEach(cleanup)

describe('SignupScreen', () => {
  it('removes the selected pet and selects the adjacent pet', async () => {
    const user = userEvent.setup()

    render(<SignupScreen onDone={vi.fn()} />)

    await user.type(screen.getByPlaceholderText('사용할 닉네임을 입력하세요'), '테스터')
    await user.click(screen.getByRole('button', { name: '다음 — 반려동물 등록' }))

    await user.click(screen.getByRole('button', { name: '반려동물 추가하기' }))
    await user.type(screen.getByPlaceholderText('반려동물 이름'), '두리')
    await user.click(screen.getByRole('button', { name: '반려동물 추가' }))
    await user.type(screen.getByPlaceholderText('반려동물 이름'), '몽이')

    await user.click(screen.getByRole('button', { name: '두리' }))
    await user.click(screen.getByRole('button', { name: '두리 추가 취소' }))

    expect(screen.queryByRole('button', { name: '두리' })).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('반려동물 이름')).toHaveValue('몽이')
  })

  it('keeps the required first pet from being deleted', async () => {
    const user = userEvent.setup()

    render(<SignupScreen onDone={vi.fn()} />)

    await user.type(screen.getByPlaceholderText('사용할 닉네임을 입력하세요'), '테스터')
    await user.click(screen.getByRole('button', { name: '다음 — 반려동물 등록' }))

    expect(screen.queryByRole('button', { name: /추가 취소/ })).not.toBeInTheDocument()
  })
})
