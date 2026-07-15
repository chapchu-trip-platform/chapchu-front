'use client'

import { ArrowLeft, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
  rightAction?: React.ReactNode
  transparent?: boolean
  className?: string
}

export default function TopBar({
  title,
  showBack,
  onBack,
  rightAction,
  transparent,
  className,
}: TopBarProps) {
  return (
    <>
      <div aria-hidden="true" className="h-14 flex-shrink-0" />
      <header
        className={cn(
          'fixed left-1/2 top-0 z-40 flex h-14 w-full max-w-[430px] -translate-x-1/2 items-center justify-between px-4',
          transparent ? 'bg-transparent' : 'bg-card-surface border-b border-border',
          className
        )}
      >
        <div className="w-10 flex items-center">
          {showBack && (
            <button
              onClick={onBack}
              aria-label="뒤로 가기"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-deep-brown" />
            </button>
          )}
        </div>

        {title && (
          <h1 className="text-[17px] font-semibold text-deep-brown text-balance text-center flex-1">
            {title}
          </h1>
        )}

        <div className="w-10 flex items-center justify-end">
          {rightAction ?? (
            <button
              aria-label="알림"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors relative"
            >
              <Bell className="w-5 h-5 text-deep-brown" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-soft-orange rounded-full" />
            </button>
          )}
        </div>
      </header>
    </>
  )
}
