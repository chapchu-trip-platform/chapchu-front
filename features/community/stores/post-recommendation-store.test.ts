import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { setPostRecommendation } from '@/features/community/api/community-api'
import { usePostRecommendationStore } from './post-recommendation-store'

vi.mock('@/features/community/api/community-api')

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(yes => { resolve = yes })
  return { promise, resolve }
}

beforeEach(() => {
  vi.resetAllMocks()
  useAuthStore.setState({ status: 'authenticated', sessionEpoch: 0 })
  usePostRecommendationStore.getState().reset()
})

describe('session recommendation confirmations', () => {
  it('records only successful writes per post and retains a confirmed recommendation on failed cancellation', async () => {
    const { change } = usePostRecommendationStore.getState()
    await change('post-1', true)
    const failure = { type: 'server', status: 500 }
    vi.mocked(setPostRecommendation).mockRejectedValueOnce(failure)
    await expect(change('post-1', false)).rejects.toEqual(failure)
    expect(usePostRecommendationStore.getState().byPost['post-1']).toEqual({ value: true, pending: false })
    expect(usePostRecommendationStore.getState().byPost['post-2']).toBeUndefined()
    await change('post-1', false)
    expect(usePostRecommendationStore.getState().byPost['post-1'].value).toBe(false)
  })

  it('does not treat a duplicate response as a confirmation and never follows it with DELETE', async () => {
    vi.mocked(setPostRecommendation).mockRejectedValueOnce({ status: 409, type: 'unknown' })
    await expect(usePostRecommendationStore.getState().change('post-1', true)).rejects.toMatchObject({ status: 409 })
    expect(usePostRecommendationStore.getState().byPost['post-1'].value).toBeUndefined()
    expect(setPostRecommendation).toHaveBeenCalledExactlyOnceWith('post-1', true)
  })

  it('prevents a second mutation while a request is pending even across different mounted screens', async () => {
    const request = deferred()
    vi.mocked(setPostRecommendation).mockReturnValueOnce(request.promise)
    const first = usePostRecommendationStore.getState().change('post-1', true)
    await expect(usePostRecommendationStore.getState().change('post-1', true)).rejects.toThrow('already pending')
    await expect(usePostRecommendationStore.getState().change('post-1', false)).rejects.toThrow('already pending')
    expect(setPostRecommendation).toHaveBeenCalledOnce()
    request.resolve()
    await first
    expect(usePostRecommendationStore.getState().byPost['post-1']).toEqual({ value: true, pending: false })
  })

  it.each(['epoch', 'status'] as const)('does not let a late response overwrite a new session or release its pending lock after a %s change', async change => {
    const old = deferred()
    const current = deferred()
    vi.mocked(setPostRecommendation).mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const first = usePostRecommendationStore.getState().change('post-1', true)
    if (change === 'epoch') useAuthStore.setState({ sessionEpoch: 1 })
    else useAuthStore.setState({ status: 'unauthenticated' })
    useAuthStore.setState({ status: 'authenticated' })
    const second = usePostRecommendationStore.getState().change('post-1', false)
    old.resolve()
    await first
    expect(usePostRecommendationStore.getState().byPost['post-1']).toEqual({ pending: true })
    current.resolve()
    await second
    expect(usePostRecommendationStore.getState().byPost['post-1']).toEqual({ value: false, pending: false })
  })
})
