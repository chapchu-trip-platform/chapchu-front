import CommunityRoute from '@/features/community/components/community-route'

interface CommunityPageProps {
  searchParams: Promise<{
    post?: string | string[]
    tab?: string | string[]
  }>
}

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const params = await searchParams
  const postParam = Array.isArray(params.post) ? params.post[0] : params.post

  return <CommunityRoute
    initialPostId={postParam}
    initialTab={params.tab === 'free' ? 'free' : undefined}
  />
}
