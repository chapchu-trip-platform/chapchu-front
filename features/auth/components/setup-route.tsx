'use client'

import { useRouter } from 'next/navigation'
import SignupScreen from '@/components/screens/signup-screen'

export default function SetupRoute() {
  const router = useRouter()

  return <SignupScreen onDone={() => router.push('/home')} />
}
