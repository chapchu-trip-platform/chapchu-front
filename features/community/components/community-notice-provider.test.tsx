import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { CommunityNoticeProvider, useCommunityNotice } from './community-notice-provider'

afterEach(cleanup)

function Actions() {
  const show = useCommunityNotice()
  return <>
    <button onClick={event => show('북마크에 저장했어요.', event.currentTarget)}>저장</button>
    <button onClick={event => {
      show('첫 작업 완료', event.currentTarget)
      show('둘째 작업 완료', event.currentTarget)
    }}>동시 완료</button>
  </>
}

describe('community notice modal', () => {
  it('traps focus, closes from the backdrop, restores focus and supports repeated identical notices', async () => {
    const user = userEvent.setup()
    render(<CommunityNoticeProvider><Actions /></CommunityNoticeProvider>)
    const trigger = screen.getByRole('button', { name: '저장' })
    await user.click(trigger)
    const modal = await screen.findByRole('dialog', { name: '안내' })
    expect(modal).toHaveTextContent('북마크에 저장했어요.')
    const close = screen.getByRole('button', { name: '닫기' })
    await waitFor(() => expect(close).toHaveFocus())
    await user.tab()
    await waitFor(() => expect(close).toHaveFocus())
    await user.tab({ shift: true })
    await waitFor(() => expect(close).toHaveFocus())
    await user.click(modal)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByTestId('notice-modal-backdrop'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
    await user.click(trigger)
    expect(await screen.findByRole('dialog')).toHaveTextContent('북마크에 저장했어요.')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
    await user.click(trigger)
    expect(await screen.findByRole('dialog')).toHaveTextContent('북마크에 저장했어요.')
    await user.click(screen.getByRole('button', { name: '닫기' }))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('queues concurrent results in one modal and clears them when the screen is removed', async () => {
    const user = userEvent.setup()
    const view = render(<CommunityNoticeProvider><Actions /></CommunityNoticeProvider>)
    await user.click(screen.getByRole('button', { name: '동시 완료' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('첫 작업 완료')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('둘째 작업 완료')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    view.unmount()
    render(<CommunityNoticeProvider><Actions /></CommunityNoticeProvider>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
