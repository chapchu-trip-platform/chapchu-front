'use client'

import Image from 'next/image'
import { useEffect } from 'react'

interface SplashScreenProps {
  onDone: () => void
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="flex flex-col items-center justify-center flex-1 bg-warm-beige px-8 gap-6">
      {/* Logo */}
      <div className="relative w-24 h-24">
        <Image
          src="/images/paw-logo.png"
          alt="PawRoute 로고"
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Service name */}
      <div className="text-center">
        <h1 className="text-[28px] font-bold text-deep-brown tracking-tight">PawRoute</h1>
        <p className="text-[15px] text-warm-gray mt-2 leading-relaxed text-balance text-center">
          반려동물과 함께하는
          <br />
          특별한 여행의 시작
        </p>
      </div>

      {/* Loading dots */}
      <div className="flex gap-2 mt-8">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-sage-green inline-block"
            style={{
              animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
