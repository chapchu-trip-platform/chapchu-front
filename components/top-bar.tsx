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
    <header
      className={cn(
        'flex items-center justify-between px-4 h-14 sticky top-0 z-40',
        transparent
          ? 'bg-transparent'
          : 'bg-card-surface border-b border-border',
        className
      )}
    >
      {/* Left */}
      <div className="w-10 flex items-center">
        {showBack && (
          <button
            onClick={onBack}
            aria-label="뒤로가기"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-deep-brown" />
          </button>
        )}
      </div>

      {/* Center */}
      {title && (
        <h1 className="text-[17px] font-semibold text-deep-brown text-balance text-center flex-1">
          {title}
        </h1>
      )}

      {/* Right */}
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
  )
}
