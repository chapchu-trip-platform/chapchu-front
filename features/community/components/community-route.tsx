import CommunityScreen from '@/components/screens/community-screen'

interface CommunityRouteProps {
  initialPostId?: string
}

export default function CommunityRoute({ initialPostId }: CommunityRouteProps) {
  return <CommunityScreen initialPostId={initialPostId} />
}
