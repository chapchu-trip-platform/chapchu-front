import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CommunityRoute from '@/features/community/components/community-route'

vi.mock('@/components/screens/community-screen', () => ({
  default: ({ initialPostId, initialTab }: { initialPostId?: string; initialTab?: string }) => (
    <div data-testid="community-api-screen">
      {initialPostId ?? 'no-post'}:{initialTab ?? 'hot'}
    </div>
  ),
}))

afterEach(cleanup)

describe('CommunityRoute', () => {
  it('always renders the API-backed community screen with the requested tab', () => {
    render(<CommunityRoute initialPostId="post-1" initialTab="review" />)

    expect(screen.getByTestId('community-api-screen')).toHaveTextContent('post-1:review')
    expect(screen.queryByTestId('demo-community')).not.toBeInTheDocument()
  })
})
