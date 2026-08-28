'use client'

import { useRouter } from 'next/navigation'
import LoginScreen from '@/components/screens/login-screen'
import { navigateToGoogleLogin } from '@/features/auth/api/auth-api'
import { useAuthStore } from '@/features/auth/stores/auth-store'

export default function LoginRoute() {
  const router = useRouter()
  const authNotice = useAuthStore((state) => state.authNotice)
  const demoLoginEnabled = process.env.NODE_ENV !== 'production'

  const handleDemoLogin = () => {
    useAuthStore.getState().startDemoSession()
    router.push('/setup?mode=demo')
  }

  return (
    <LoginScreen
      onGoogleLogin={navigateToGoogleLogin}
      onLogin={demoLoginEnabled ? handleDemoLogin : undefined}
      notice={authNotice === 'logout-failed'
        ? '서버 로그아웃을 완료하지 못했습니다. 다시 로그인하기 전에 잠시 후 재시도해주세요.'
        : undefined}
    />
  )
}
