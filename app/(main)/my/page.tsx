import ProfileRoute from '@/features/profile/components/profile-route'

interface MyPageProps {
  searchParams: Promise<{
    section?: string | string[]
  }>
}

export default async function MyPage({ searchParams }: MyPageProps) {
  const params = await searchParams
  const section = Array.isArray(params.section) ? params.section[0] : params.section

  return <ProfileRoute initialSettingsTab={section === 'posts' ? 'posts' : undefined} />
}
