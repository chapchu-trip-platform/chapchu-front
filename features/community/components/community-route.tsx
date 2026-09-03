'use client'

import CommunityScreen from '@/components/screens/community-screen'
import CommunityDemoScreen from '@/features/community/components/community-demo-screen'
import { useAuthStore } from '@/features/auth/stores/auth-store'

interface CommunityRouteProps {
  initialPostId?: string
}

export default function CommunityRoute({ initialPostId }: CommunityRouteProps) {
  const status = useAuthStore(state => state.status)
  if (status === 'demo' && process.env.NODE_ENV !== 'production') {
    return <CommunityDemoScreen initialPostId={initialPostId} />
  }
  return <CommunityScreen initialPostId={initialPostId} />
}
