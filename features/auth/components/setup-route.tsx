'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SignupScreen from '@/components/screens/signup-screen'
import { Button } from '@/components/ui/button'
import { navigateToGoogleLogin } from '@/features/auth/api/auth-api'
import {
  fetchSignupOptions,
  getSignupErrorMessage,
  getSignupOptionsErrorMessage,
  submitIntegratedSignup,
} from '@/features/auth/api/signup-api'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import type {
  SignupFormValues,
  SignupOptions,
} from '@/features/auth/types/signup'

type OptionsStatus = 'idle' | 'loading' | 'ready' | 'failed'

export default function SetupRoute() {
  const router = useRouter()
  const authStatus = useAuthStore((state) => state.status)
  const registrationToken = useAuthStore((state) => state.registrationToken)
  const setupStage = useAuthStore((state) => state.setupStage)
  const [options, setOptions] = useState<SignupOptions | null>(null)
  const [optionsStatus, setOptionsStatus] = useState<OptionsStatus>('idle')
  const [optionsError, setOptionsError] = useState<string | null>(null)

  const isDemo = authStatus === 'demo'
  const isRegistration =
    setupStage === 'registration' && Boolean(registrationToken)
  const hasSetupFlow = isDemo || isRegistration

  const loadOptions = useCallback(async (background = false) => {
    if (!background) setOptionsStatus('loading')
    setOptionsError(null)

    try {
      const signupOptions = await fetchSignupOptions()
      setOptions(signupOptions)
      setOptionsStatus('ready')
    } catch (error) {
      setOptionsError(getSignupOptionsErrorMessage(error))
      if (!background) {
        setOptions(null)
        setOptionsStatus('failed')
      }
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const isDemoQuery = params.get('mode') === 'demo'

    if (params.has('registration_token')) {
      window.history.replaceState(null, '', '/setup')
      router.replace('/login')
      return
    }

    if (isDemoQuery && useAuthStore.getState().status === 'demo') return

    if (useAuthStore.getState().registrationToken) {
      useAuthStore.getState().setSetupStage('registration')
      return
    }

    router.replace('/login')
  }, [router])

  useEffect(() => {
    if (!hasSetupFlow || optionsStatus !== 'idle') return

    const timeoutId = window.setTimeout(() => void loadOptions(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [hasSetupFlow, loadOptions, optionsStatus])

  const handleIntegratedSignup = async (values: SignupFormValues) => {
    const token = useAuthStore.getState().registrationToken
    if (!token) {
      router.replace('/login')
      throw new Error('회원가입 시간이 만료되었습니다. Google 로그인부터 다시 시작해주세요.')
    }

    try {
      await submitIntegratedSignup({
        registrationToken: token,
        ...values,
      })
    } catch (error) {
      const status = (error as { status?: number }).status
      if (status === 401) {
        useAuthStore.getState().setRegistrationToken(null)
        useAuthStore.getState().setSetupStage(null)
        try {
          navigateToGoogleLogin()
        } catch {
          router.replace('/login')
        }
      }
      if (status === 404) await loadOptions(true)
      throw new Error(getSignupErrorMessage(error))
    }

    useAuthStore.getState().setRegistrationToken(null)
    useAuthStore.getState().setSetupStage(null)

    try {
      navigateToGoogleLogin()
    } catch {
      router.replace('/login')
      throw new Error(
        '회원가입은 완료되었습니다. 로그인 화면에서 Google 로그인을 다시 진행해주세요.'
      )
    }
  }

  const handleDemoComplete = async () => {
    router.replace('/home')
  }

  if (!hasSetupFlow) {
    return (
      <div className="flex flex-1 items-center justify-center bg-warm-beige">
        <p className="text-[13px] text-warm-gray">회원 정보를 확인하고 있어요…</p>
      </div>
    )
  }

  if (optionsStatus === 'failed') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-warm-beige px-6 text-center">
        <div>
          <p className="text-[15px] font-semibold text-deep-brown">
            선택지를 불러오지 못했어요
          </p>
          <p role="alert" className="mt-2 text-[13px] text-warm-gray">
            {optionsError}
          </p>
        </div>
        <Button onClick={() => void loadOptions()}>다시 불러오기</Button>
      </div>
    )
  }

  if (optionsStatus !== 'ready' || !options) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-warm-beige">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage-green border-t-transparent" />
        <p className="text-[13px] text-warm-gray">회원가입 선택지를 불러오고 있어요…</p>
      </div>
    )
  }

  return (
    <SignupScreen
      options={options}
      onSubmit={isRegistration ? handleIntegratedSignup : handleDemoComplete}
    />
  )
}
