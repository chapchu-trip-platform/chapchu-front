'use client'

import { useRouter } from 'next/navigation'
import HomeScreen from '@/components/screens/home-screen'

export default function HomeRoute() {
  const router = useRouter()

  return (
    <HomeScreen
      onStartTrip={() => router.push('/map')}
      onViewPost={() => router.push('/community')}
    />
  )
}
