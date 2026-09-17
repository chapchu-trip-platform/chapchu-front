'use client'

import CommunityScreen from '@/components/screens/community-screen'
import CommunityDemoScreen from '@/features/community/components/community-demo-screen'
import { useAuthStore } from '@/features/auth/stores/auth-store'

interface CommunityRouteProps {
  initialPostId?: string
  initialTab?: 'free' | 'review'
}

export default function CommunityRoute({ initialPostId, initialTab }: CommunityRouteProps) {
  const status = useAuthStore(state => state.status)
  if (status === 'demo' && process.env.NODE_ENV !== 'production') {
    return <CommunityDemoScreen initialPostId={initialPostId} initialTab={initialTab} />
  }
  return <CommunityScreen initialPostId={initialPostId} initialTab={initialTab} />
}
