'use client'

import { ArrowLeft } from 'lucide-react'
import { IconButton } from '@/components/ui/icon-button'
import { NotificationButton } from '@/components/ui/notification-button'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
  rightAction?: React.ReactNode
  hasUnreadNotifications?: boolean
  onNotificationClick?: () => void
  transparent?: boolean
  className?: string
}

export default function TopBar({
  title,
  showBack,
  onBack,
  rightAction,
  hasUnreadNotifications = true,
  onNotificationClick,
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
            <IconButton
              onClick={onBack}
              aria-label="뒤로 가기"
            >
              <ArrowLeft className="w-5 h-5 text-deep-brown" />
            </IconButton>
          )}
        </div>

        {title && (
          <h1 className="text-[17px] font-semibold text-deep-brown text-balance text-center flex-1">
            {title}
          </h1>
        )}

        <div className="w-10 flex items-center justify-end">
          {rightAction ?? (
            <NotificationButton
              hasUnread={hasUnreadNotifications}
              onClick={onNotificationClick}
            />
          )}
        </div>
      </header>
    </>
  )
}
