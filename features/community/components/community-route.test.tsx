import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import CommunityRoute from './community-route'

vi.mock('@/components/screens/community-screen', () => ({
  default: ({ initialPostId, initialTab }: { initialPostId?: string; initialTab?: string }) => (
    <div data-testid="live-community">
      {initialPostId ?? 'no-post'}:{initialTab ?? 'hot'}
    </div>
  ),
}))

vi.mock('@/features/community/components/community-demo-screen', () => ({
  default: ({ initialPostId, initialTab }: { initialPostId?: string; initialTab?: string }) => (
    <div data-testid="demo-community">
      {initialPostId ?? 'no-post'}:{initialTab ?? 'hot'}
    </div>
  ),
}))

describe('CommunityRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'authenticated' })
  })

  afterEach(cleanup)

  it('preserves the travel-review tab for the live board', () => {
    render(<CommunityRoute initialPostId="post-1" initialTab="review" />)

    expect(screen.getByTestId('live-community')).toHaveTextContent('post-1:review')
  })

  it('preserves the travel-review tab in demo mode', () => {
    useAuthStore.setState({ status: 'demo' })
    render(<CommunityRoute initialTab="review" />)

    expect(screen.getByTestId('demo-community')).toHaveTextContent('no-post:review')
  })
})
