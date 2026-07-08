'use client'

import { useRouter } from 'next/navigation'
import MobileShell from '@/components/layout/mobile-shell'
import SplashScreen from '@/components/screens/splash-screen'

export default function SplashRoute() {
  const router = useRouter()

  return (
    <MobileShell>
      <SplashScreen onDone={() => router.push('/onboarding')} />
    </MobileShell>
  )
}
