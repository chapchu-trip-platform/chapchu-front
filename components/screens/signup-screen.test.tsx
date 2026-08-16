import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SignupScreen from '@/components/screens/signup-screen'
import type { SignupOptions } from '@/features/auth/types/signup'

const options: SignupOptions = {
  regions: [{ id: 'region-seoul', name: '서울' }],
  themes: [{ id: 'theme-nature', name: '자연' }],
  transportMethods: [
    { id: 'transport-car', name: '자가용' },
    { id: 'transport-walk', name: '도보' },
  ],
  breeds: [
    { id: 7, name: '골든리트리버' },
    { id: 157, name: '믹스견' },
  ],
  activities: [{ id: 'activity-walk', name: '산책' }],
}

afterEach(cleanup)

describe('SignupScreen', () => {
  it('removes the selected pet and selects the adjacent pet', async () => {
    const user = userEvent.setup()

    render(<SignupScreen options={options} onSubmit={vi.fn()} />)

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

  it('keeps the required first pet draft from being deleted', async () => {
    const user = userEvent.setup()

    render(<SignupScreen options={options} onSubmit={vi.fn()} />)

    await user.type(screen.getByPlaceholderText('사용할 닉네임을 입력하세요'), '테스터')
    await user.click(screen.getByRole('button', { name: '다음 — 반려동물 등록' }))

    expect(screen.queryByRole('button', { name: /추가 취소/ })).not.toBeInTheDocument()
  })

  it('submits API option IDs and a complete pet in one form value', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<SignupScreen options={options} onSubmit={onSubmit} />)

    await user.type(screen.getByPlaceholderText('사용할 닉네임을 입력하세요'), ' 햇살이 ')
    await user.click(screen.getByRole('button', { name: '자연' }))
    await user.click(screen.getByRole('button', { name: '서울' }))
    await user.click(screen.getByRole('button', { name: '자가용' }))
    await user.click(screen.getByRole('button', { name: '도보' }))
    await user.click(screen.getByRole('button', { name: '다음 — 반려동물 등록' }))

    await user.type(screen.getByPlaceholderText('반려동물 이름'), ' 초코 ')
    await user.selectOptions(screen.getByRole('combobox', { name: '견종' }), '7')
    await user.type(screen.getByPlaceholderText('3'), '3')
    await user.click(screen.getByRole('button', { name: '중형' }))
    await user.click(screen.getByRole('button', { name: '산책' }))
    await user.click(screen.getByRole('button', { name: '완료 — 회원가입하기' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        user: {
          nickname: '햇살이',
          regionIds: ['region-seoul'],
          themeIds: ['theme-nature'],
          transportMethodIds: ['transport-car', 'transport-walk'],
        },
        pets: [
          {
            petName: '초코',
            breedId: 7,
            size: 'MEDIUM',
            age: 3,
            activityIds: ['activity-walk'],
          },
        ],
      })
    )
  })

  it('omits an untouched optional pet draft', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<SignupScreen options={options} onSubmit={onSubmit} />)

    await user.type(screen.getByPlaceholderText('사용할 닉네임을 입력하세요'), '테스터')
    await user.click(screen.getByRole('button', { name: '다음 — 반려동물 등록' }))
    await user.click(screen.getByRole('button', { name: '완료 — 회원가입하기' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        user: {
          nickname: '테스터',
          regionIds: [],
          themeIds: [],
          transportMethodIds: [],
        },
        pets: [],
      })
    )
  })

  it('blocks a partially filled pet until all required fields are complete', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<SignupScreen options={options} onSubmit={onSubmit} />)

    await user.type(screen.getByPlaceholderText('사용할 닉네임을 입력하세요'), '테스터')
    await user.click(screen.getByRole('button', { name: '다음 — 반려동물 등록' }))
    await user.type(screen.getByPlaceholderText('반려동물 이름'), '초코')
    await user.click(screen.getByRole('button', { name: '완료 — 회원가입하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '입력 중인 반려동물의 이름, 견종, 나이를 모두 확인해주세요.'
    )
    expect(onSubmit).not.toHaveBeenCalled()

    await user.selectOptions(screen.getByRole('combobox', { name: '견종' }), '7')
    await user.type(screen.getByPlaceholderText('3'), '3')
    await user.click(screen.getByRole('button', { name: '완료 — 회원가입하기' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
  })
})
