import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PostShareSheet from '@/components/screens/post-share-sheet'

afterEach(cleanup)

describe('PostShareSheet', () => {
  it('slides up without a duplicate review field and shares the overall review', async () => {
    const user = userEvent.setup()
    const onShare = vi.fn()
    const onClose = vi.fn()

    render(
      <PostShareSheet
        onClose={onClose}
        onShare={onShare}
        tripTitle="골든이와의 서울 성수 여행"
        tripImage="/images/album-cover.png"
        petName="골든이"
        tripReview="여행 종료 화면에서 작성한 전체 후기"
      />
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass(
      'slide-up',
      'drop-shadow-[0_-10px_24px_rgba(58,47,42,0.18)]'
    )
    expect(dialog).not.toHaveClass('max-h-[85vh]', 'rounded-t-[28px]')
    expect(dialog.firstElementChild).toHaveClass(
      'max-h-[85vh]',
      'rounded-t-[28px]',
      '[clip-path:inset(0_round_28px_28px_0_0)]'
    )
    expect(dialog).not.toHaveClass('border', 'ring-1')
    expect(dialog.previousElementSibling).toHaveClass('absolute', 'inset-0', 'bg-black/25')
    expect(dialog.previousElementSibling).not.toHaveClass('backdrop-blur-sm')
    expect(document.querySelector('textarea')).toBeNull()

    await user.click(screen.getByRole('button', { name: '공유하기' }))

    await waitFor(
      () =>
        expect(onShare).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '골든이와의 서울 성수 여행',
            content: '여행 종료 화면에서 작성한 전체 후기',
          })
        ),
      { timeout: 1500 }
    )
    expect(screen.getByRole('button', { name: '공유 완료' })).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()

    await waitFor(() => expect(dialog.previousElementSibling).toHaveClass('bg-transparent'), {
      timeout: 1000,
    })
    await waitFor(() => expect(dialog).toHaveClass('translate-y-full', 'duration-[320ms]'))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce(), { timeout: 800 })
  })

  it('slides down before closing from the X button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <PostShareSheet
        onClose={onClose}
        onShare={vi.fn()}
        tripTitle="골든이와의 서울 성수 여행"
        tripImage="/images/album-cover.png"
        petName="골든이"
        tripReview="전체 후기"
      />
    )

    await user.click(screen.getByRole('button', { name: '공유 창 닫기' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog.previousElementSibling).toHaveClass('bg-transparent')
    expect(dialog).not.toHaveClass('translate-y-full')
    expect(onClose).not.toHaveBeenCalled()

    await waitFor(() => expect(dialog).toHaveClass('translate-y-full', 'duration-[320ms]'))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce(), { timeout: 800 })
  })
})
