'use client'

import { useRouter } from 'next/navigation'
import OnboardingScreen from '@/components/screens/onboarding-screen'

export default function OnboardingRoute() {
  const router = useRouter()

  return <OnboardingScreen onDone={() => router.push('/login')} />
}
