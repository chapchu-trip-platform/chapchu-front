'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { completeLogin } from '@/lib/auth'

/**
 * chapchu-auth가 인가 코드를 돌려주는 지점.
 *
 * 이 경로는 인증 서버에 `FRONT_REDIRECT_URI`로 등록돼 있어야 한다. 등록되지 않은 주소로 요청하면
 * 에러 없이 구글 로그인만 거친 뒤 여기까지 오지 못한다.
 *
 * useSearchParams 대신 window.location.search를 직접 읽는다. 그래야 Suspense 경계 없이도 동작한다.
 */
export default function LoginCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    completeLogin(new URLSearchParams(window.location.search))
      .then(() => {
        if (cancelled) return
        // 인가 코드가 주소창에 남지 않도록 히스토리에서 치운다.
        router.replace('/')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : '로그인에 실패했습니다.')
      })

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-warm-beige px-6 gap-4">
      {error === null ? (
        <>
          <div className="w-8 h-8 border-2 border-deep-brown border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-warm-gray">로그인 중입니다…</p>
        </>
      ) : (
        <>
          <p className="text-[15px] font-semibold text-deep-brown">로그인하지 못했습니다</p>
          <p className="text-[13px] text-warm-gray text-center leading-relaxed">{error}</p>
          <button
            onClick={() => router.replace('/')}
            className="h-11 px-6 rounded-btn bg-deep-brown text-white font-semibold text-[14px] active:opacity-80"
          >
            처음으로 돌아가기
          </button>
        </>
      )}
    </div>
  )
}
