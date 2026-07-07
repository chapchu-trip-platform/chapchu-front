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
      <div className="relative h-72">
        <Image
          src="/images/dog-hero.png"
          alt="반려동물과 함께하는 여행"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-warm-beige" />
      </div>

      {/* Content */}
      <div className="flex flex-col px-6 gap-2 -mt-4">
        {/* Logo + Name */}
        <div className="flex items-center gap-2 mb-1">
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

        {/* Social Login Buttons */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full h-12 rounded-btn flex items-center justify-center gap-3 bg-[#FEE500] text-[#3C1E1E] font-semibold text-[15px] active:opacity-80 transition-opacity shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.077 2 11.1c0 3.16 1.657 5.953 4.204 7.712-.184.683-.667 2.469-.765 2.852 0 0-.015.12.065.167.079.047.173.008.173.008.228-.032 2.638-1.73 3.047-2.006A11.3 11.3 0 0 0 12 20.2c5.523 0 10-4.077 10-9.1C22 6.077 17.523 2 12 2Z" fill="#3C1E1E"/>
          </svg>
          카카오로 계속하기
        </button>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full h-12 rounded-btn flex items-center justify-center gap-3 bg-white text-deep-brown font-semibold text-[15px] border border-border active:opacity-80 transition-opacity shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google로 계속하기
        </button>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full h-12 rounded-btn flex items-center justify-center gap-3 bg-deep-brown text-white font-semibold text-[15px] active:opacity-80 transition-opacity shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.32.07 2.22.72 2.98.76 1.13-.19 2.2-.9 3.43-.77 1.47.18 2.58.75 3.31 1.88-3.03 1.83-2.52 5.85.37 6.98-.69 1.93-1.62 3.83-3.09 4.03zM13 3.5c.07 1.7-1.28 3.1-2.96 3.23-2.07-1.15-.38-3.65 2.96-3.23z"/>
          </svg>
          Apple로 계속하기
        </button>

        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[12px] text-warm-gray">또는</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={handleLogin}
          className="w-full h-11 rounded-btn border border-border text-warm-gray font-medium text-[14px] active:opacity-80 transition-opacity"
        >
          테스트 계정으로 로그인
        </button>
      </div>

      <p className="text-center text-[11px] text-warm-gray px-6 mt-4 pb-8 leading-relaxed">
        로그인 시 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다.
      </p>
    </div>
  )
}
