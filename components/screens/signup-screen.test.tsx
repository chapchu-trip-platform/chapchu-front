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

const createNicknameCheck = (available = true) =>
  vi.fn(async (nickname: string) => ({ nickname, available }))

async function confirmCurrentNickname(
  user: ReturnType<typeof userEvent.setup>
) {
  await user.click(screen.getByRole('button', { name: '중복 확인' }))
  await screen.findByRole('button', { name: '확인 완료' })
}

afterEach(cleanup)

describe('SignupScreen', () => {
  it('removes the selected pet and selects the adjacent pet', async () => {
    const user = userEvent.setup()

    render(
      <SignupScreen
        options={options}
        onCheckNickname={createNicknameCheck()}
        onSubmit={vi.fn()}
      />
    )

    await user.type(screen.getByPlaceholderText('사용할 닉네임을 입력하세요'), '테스터')
    await confirmCurrentNickname(user)
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

    render(
      <SignupScreen
        options={options}
        onCheckNickname={createNicknameCheck()}
        onSubmit={vi.fn()}
      />
    )

    await user.type(screen.getByPlaceholderText('사용할 닉네임을 입력하세요'), '테스터')
    await confirmCurrentNickname(user)
    await user.click(screen.getByRole('button', { name: '다음 — 반려동물 등록' }))

    expect(screen.queryByRole('button', { name: /추가 취소/ })).not.toBeInTheDocument()
  })

  it('submits API option IDs and a complete pet in one form value', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <SignupScreen
        options={options}
        onCheckNickname={createNicknameCheck()}
        onSubmit={onSubmit}
      />
    )

    await user.type(screen.getByPlaceholderText('사용할 닉네임을 입력하세요'), ' 햇살이 ')
    await confirmCurrentNickname(user)
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
    render(
      <SignupScreen
        options={options}
        onCheckNickname={createNicknameCheck()}
        onSubmit={onSubmit}
      />
    )

    await user.type(screen.getByPlaceholderText('사용할 닉네임을 입력하세요'), '테스터')
    await confirmCurrentNickname(user)
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
    render(
      <SignupScreen
        options={options}
        onCheckNickname={createNicknameCheck()}
        onSubmit={onSubmit}
      />
    )

    await user.type(screen.getByPlaceholderText('사용할 닉네임을 입력하세요'), '테스터')
    await confirmCurrentNickname(user)
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

  it('keeps the next step disabled until the current nickname is available', async () => {
    const user = userEvent.setup()
    const onCheckNickname = createNicknameCheck()
    render(
      <SignupScreen
        options={options}
        onCheckNickname={onCheckNickname}
        onSubmit={vi.fn()}
      />
    )

    const nextButton = screen.getByRole('button', {
      name: '다음 — 반려동물 등록',
    })
    await user.type(screen.getByPlaceholderText('사용할 닉네임을 입력하세요'), '햇살이')
    expect(nextButton).toBeDisabled()

    await confirmCurrentNickname(user)

    expect(onCheckNickname).toHaveBeenCalledWith('햇살이')
    expect(screen.getByText('사용할 수 있는 닉네임이에요.')).toBeInTheDocument()
    expect(nextButton).toBeEnabled()
  })

  it('invalidates a completed check when the nickname changes', async () => {
    const user = userEvent.setup()
    render(
      <SignupScreen
        options={options}
        onCheckNickname={createNicknameCheck()}
        onSubmit={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('사용할 닉네임을 입력하세요')
    await user.type(input, '햇살이')
    await confirmCurrentNickname(user)
    await user.type(input, '2')

    expect(screen.getByRole('button', { name: '중복 확인' })).toBeEnabled()
    expect(
      screen.getByRole('button', { name: '다음 — 반려동물 등록' })
    ).toBeDisabled()
    expect(screen.getByText('중복 확인 후 다음 단계로 이동할 수 있어요.')).toBeInTheDocument()
  })

  it('keeps the next step disabled when the nickname is already in use', async () => {
    const user = userEvent.setup()
    render(
      <SignupScreen
        options={options}
        onCheckNickname={createNicknameCheck(false)}
        onSubmit={vi.fn()}
      />
    )

    await user.type(screen.getByPlaceholderText('사용할 닉네임을 입력하세요'), '중복닉네임')
    await user.click(screen.getByRole('button', { name: '중복 확인' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '이미 사용 중인 닉네임이에요.'
    )
    expect(
      screen.getByRole('button', { name: '다음 — 반려동물 등록' })
    ).toBeDisabled()
  })

  it('ignores a stale availability response after the nickname changes', async () => {
    const user = userEvent.setup()
    let resolveCheck!: (value: { nickname: string; available: boolean }) => void
    const onCheckNickname = vi.fn(
      () =>
        new Promise<{ nickname: string; available: boolean }>((resolve) => {
          resolveCheck = resolve
        })
    )
    render(
      <SignupScreen
        options={options}
        onCheckNickname={onCheckNickname}
        onSubmit={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('사용할 닉네임을 입력하세요')
    await user.type(input, '첫닉네임')
    await user.click(screen.getByRole('button', { name: '중복 확인' }))
    await user.type(input, '변경')
    resolveCheck({ nickname: '첫닉네임', available: true })

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '다음 — 반려동물 등록' })
      ).toBeDisabled()
    )
    expect(screen.queryByText('사용할 수 있는 닉네임이에요.')).not.toBeInTheDocument()
  })

  it('ignores a stale availability error after the nickname changes', async () => {
    const user = userEvent.setup()
    let rejectCheck!: (reason: Error) => void
    const onCheckNickname = vi.fn(
      () =>
        new Promise<{ nickname: string; available: boolean }>((_, reject) => {
          rejectCheck = reject
        })
    )
    render(
      <SignupScreen
        options={options}
        onCheckNickname={onCheckNickname}
        onSubmit={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('사용할 닉네임을 입력하세요')
    await user.type(input, '첫닉네임')
    await user.click(screen.getByRole('button', { name: '중복 확인' }))
    await user.type(input, '변경')
    rejectCheck(new Error('이전 요청 실패'))

    await waitFor(() =>
      expect(screen.queryByText('이전 요청 실패')).not.toBeInTheDocument()
    )
    expect(
      screen.getByRole('button', { name: '다음 — 반려동물 등록' })
    ).toBeDisabled()
  })

  it('fails closed when the response nickname does not match the request', async () => {
    const user = userEvent.setup()
    render(
      <SignupScreen
        options={options}
        onCheckNickname={vi.fn().mockResolvedValue({
          nickname: '다른닉네임',
          available: true,
        })}
        onSubmit={vi.fn()}
      />
    )

    await user.type(screen.getByPlaceholderText('사용할 닉네임을 입력하세요'), '요청닉네임')
    await user.click(screen.getByRole('button', { name: '중복 확인' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '닉네임 확인 결과가 일치하지 않습니다.'
    )
    expect(
      screen.getByRole('button', { name: '다음 — 반려동물 등록' })
    ).toBeDisabled()
  })

  it('invalidates nickname approval when final signup reports a conflict', async () => {
    const user = userEvent.setup()
    const signupConflict = Object.assign(new Error('닉네임 충돌'), {
      status: 409,
    })
    render(
      <SignupScreen
        options={options}
        onCheckNickname={createNicknameCheck()}
        onSubmit={vi.fn().mockRejectedValue(signupConflict)}
      />
    )

    await user.type(screen.getByLabelText('닉네임'), '경쟁닉네임')
    await confirmCurrentNickname(user)
    await user.click(screen.getByRole('button', { name: '다음 — 반려동물 등록' }))
    await user.click(screen.getByRole('button', { name: '완료 — 회원가입하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '가입 처리 중 닉네임이 사용되었습니다.'
    )
    expect(screen.getByRole('heading', { name: '기본 정보 입력' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '중복 확인' })).toBeEnabled()
    expect(
      screen.getByRole('button', { name: '다음 — 반려동물 등록' })
    ).toBeDisabled()
  })
})
