'use client'

import CommunityScreen from '@/components/screens/community-screen'

interface CommunityRouteProps {
  initialPostId?: string
  initialTab?: 'free'
}

export default function CommunityRoute({ initialPostId, initialTab }: CommunityRouteProps) {
  return <CommunityScreen initialPostId={initialPostId} initialTab={initialTab} />
}
