import PostEditor from '@/features/community/components/post-editor'

interface WritePostPageProps {
  searchParams: Promise<{
    edit?: string | string[]
    from?: string | string[]
  }>
}

export default async function WritePostPage({ searchParams }: WritePostPageProps) {
  const params = await searchParams
  const editPostId = Array.isArray(params.edit) ? params.edit[0] : params.edit
  const from = Array.isArray(params.from) ? params.from[0] : params.from

  return <PostEditor editPostId={editPostId || undefined} returnToPrevious={from === 'detail'} />
}
