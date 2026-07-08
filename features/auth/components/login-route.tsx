'use client'

import { useRouter } from 'next/navigation'
import LoginScreen from '@/components/screens/login-screen'

export default function LoginRoute() {
  const router = useRouter()

  return <LoginScreen onLogin={() => router.push('/setup')} />
}
