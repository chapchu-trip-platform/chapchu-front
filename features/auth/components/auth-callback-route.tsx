'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { readAuthCallback } from '@/features/auth/lib/callback-params'
import {
  clearPostLoginDestination,
  consumePostLoginDestination,
} from '@/features/auth/lib/post-login-destination'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { consumeOAuthTransaction } from '@/features/auth/lib/oauth-transaction'

export default function AuthCallbackRoute() {
  const router = useRouter()
  const handled = useRef(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const result = readAuthCallback(window.location.hash, window.location.search)
    window.history.replaceState(null, '', '/auth/callback')
    const hasOAuthTransaction = consumeOAuthTransaction()

    if (!hasOAuthTransaction || result.type === 'invalid') {
      useAuthStore.getState().clearSession()
      clearPostLoginDestination()
      queueMicrotask(() => setFailed(true))
      return
    }

    if (result.type === 'registration') {
      useAuthStore.getState().clearSession()
      useAuthStore.getState().setAuthNotice(null)
      useAuthStore.getState().setRegistrationToken(result.token)
      useAuthStore.getState().setSetupStage('registration')
      clearPostLoginDestination()
      router.replace('/setup')
      return
    }

    useAuthStore.getState().setAccessToken(result.token)
    router.replace(consumePostLoginDestination())
  }, [router])

  if (failed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-warm-beige px-6 text-center">
        <div>
          <p className="text-[16px] font-semibold text-deep-brown">로그인을 완료하지 못했어요</p>
          <p className="mt-2 text-[13px] leading-relaxed text-warm-gray">
            인증 정보가 없거나 이미 사용되었습니다. 로그인부터 다시 시도해주세요.
          </p>
        </div>
        <Button onClick={() => router.replace('/login')}>로그인으로 돌아가기</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-warm-beige">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage-green border-t-transparent" />
      <p className="text-[13px] text-warm-gray">로그인을 마무리하고 있어요…</p>
    </div>
  )
}
