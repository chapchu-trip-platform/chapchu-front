import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CommunityRoute from '@/features/community/components/community-route'

vi.mock('@/components/screens/community-screen', () => ({
  default: ({ initialPostId }: { initialPostId?: string }) => (
    <div data-testid="community-api-screen" data-post-id={initialPostId} />
  ),
}))

afterEach(() => cleanup())

describe('CommunityRoute', () => {
  it('always renders the API-backed community screen', () => {
    render(<CommunityRoute initialPostId="post-1" />)

    expect(screen.getByTestId('community-api-screen')).toHaveAttribute(
      'data-post-id',
      'post-1'
    )
  })
})
