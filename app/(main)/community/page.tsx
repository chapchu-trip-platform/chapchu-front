import CommunityRoute from '@/features/community/components/community-route'

interface CommunityPageProps {
  searchParams: Promise<{
    post?: string | string[]
    tab?: string | string[]
    from?: string | string[]
  }>
}

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const params = await searchParams
  const postParam = Array.isArray(params.post) ? params.post[0] : params.post
  const fromParam = Array.isArray(params.from) ? params.from[0] : params.from

  return <CommunityRoute
    initialPostId={postParam}
    initialTab={params.tab === 'free' ? 'free' : undefined}
    returnToPrevious={fromParam === 'my-posts'}
  />
}
