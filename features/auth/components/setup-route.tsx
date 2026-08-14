'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SignupScreen from '@/components/screens/signup-screen'
import { navigateToGoogleLogin, registerMember } from '@/features/auth/api/auth-api'
import { rememberPetSetupDestination } from '@/features/auth/lib/post-login-destination'
import { refreshAccessToken } from '@/lib/api/client'
import { useAuthStore } from '@/features/auth/stores/auth-store'

export default function SetupRoute() {
  const router = useRouter()
  const status = useAuthStore((state) => state.status)
  const registrationToken = useAuthStore((state) => state.registrationToken)
  const setupStage = useAuthStore((state) => state.setupStage)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const isDemo = params.get('mode') === 'demo'
    const isPetStep = params.get('step') === 'pet'

    if (params.has('registration_token')) {
      window.history.replaceState(null, '', '/setup')
      router.replace('/login')
      return
    }

    if (isDemo && useAuthStore.getState().status === 'demo') {
      return
    }

    if (isPetStep) {
      const { accessToken, status } = useAuthStore.getState()
      if (accessToken || status === 'authenticated') {
        useAuthStore.getState().setSetupStage('pet')
        return
      }

      useAuthStore.getState().setStatus('restoring')
      refreshAccessToken()
        .then(() => useAuthStore.getState().setSetupStage('pet'))
        .catch(() => {
          router.replace('/login')
        })
      return
    }

    if (useAuthStore.getState().registrationToken) {
      useAuthStore.getState().setSetupStage('registration')
      return
    }

    router.replace('/login')
  }, [router])

  const handleRegistration = async (nickname: string) => {
    const registrationToken = useAuthStore.getState().registrationToken
    if (!registrationToken) {
      router.replace('/login')
      return false
    }

    await registerMember(registrationToken, nickname)
    useAuthStore.getState().setRegistrationToken(null)
    useAuthStore.getState().setSetupStage(null)
    rememberPetSetupDestination()
    navigateToGoogleLogin({ preservePostLoginDestination: true })
    return false
  }

  const isDemo = status === 'demo'
  const isRegistration = setupStage === 'registration' && Boolean(registrationToken)
  const isPetSetup = setupStage === 'pet' && status === 'authenticated'

  if (!isDemo && !isRegistration && !isPetSetup) {
    return (
      <div className="flex flex-1 items-center justify-center bg-warm-beige">
        <p className="text-[13px] text-warm-gray">회원 정보를 확인하고 있어요…</p>
      </div>
    )
  }

  return (
    <SignupScreen
      initialStep={isPetSetup ? 'pet' : 'user'}
      onUserSubmit={isRegistration ? handleRegistration : undefined}
      onDone={() => {
        useAuthStore.getState().setSetupStage(null)
        router.replace('/home')
      }}
    />
  )
}
