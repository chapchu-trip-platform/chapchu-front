'use client'

import Image from 'next/image'
import { useState } from 'react'

interface LoginScreenProps {
  onLogin: () => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loading, setLoading] = useState(false)

  const handleLogin = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onLogin()
    }, 800)
  }

  return (
    <div className="flex flex-col flex-1 bg-warm-beige">
      {/* Top illustration area */}
      <div className="relative z-0 h-[clamp(18rem,36dvh,22rem)] flex-shrink-0">
        <Image
          src="/images/dog-hero.png"
          alt="반려동물과 함께하는 여행"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-warm-beige" />
      </div>

      {/* Content */}
      <div className="relative z-20 -mt-4 flex flex-col gap-2 px-6">
        {/* Logo + Name */}
        <div className="relative z-30 mb-1 flex items-center gap-2">
          <div className="relative w-7 h-7">
            <Image src="/images/paw-logo.png" alt="PawRoute" fill className="object-contain" />
          </div>
          <span className="text-[20px] font-bold text-deep-brown">PawRoute</span>
        </div>

        <h2 className="text-[22px] font-bold text-deep-brown leading-snug text-balance">
          반려동물과 함께하는<br />특별한 여행을 시작해요
        </h2>
        <p className="text-[13px] text-warm-gray mb-4">
          로그인하고 나만의 여행 코스와 앨범을 만들어보세요.
        </p>

        {/* Google Login */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full h-12 rounded-btn flex items-center justify-center gap-3 bg-white text-deep-brown font-semibold text-[15px] border border-border shadow-sm transition-[filter,background-color] hover:brightness-[0.97] active:brightness-[0.94]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google로 계속하기
        </button>

        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[12px] text-warm-gray">또는</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={handleLogin}
          className="w-full h-11 rounded-btn border border-border text-warm-gray font-medium text-[14px] transition-[filter,background-color] hover:bg-muted/30 hover:brightness-[0.97] active:bg-muted/50 active:brightness-[0.94]"
        >
          테스트 계정으로 로그인
        </button>
      </div>

      <p className="safe-bottom-login mt-4 px-6 text-center text-[11px] leading-relaxed text-warm-gray">
        로그인 시 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다.
      </p>
    </div>
  )
}
