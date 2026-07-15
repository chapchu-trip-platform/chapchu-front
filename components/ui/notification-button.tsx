import type { ComponentProps } from 'react'
import { Bell } from 'lucide-react'
import { IconButton } from '@/components/ui/icon-button'

interface NotificationButtonProps
  extends Omit<ComponentProps<typeof IconButton>, 'aria-label' | 'children'> {
  hasUnread?: boolean
}

function NotificationButton({
  hasUnread = false,
  className,
  ...props
}: NotificationButtonProps) {
  const accessibleLabel = hasUnread ? '알림, 읽지 않은 알림 있음' : '알림'

  return (
    <IconButton
      aria-label={accessibleLabel}
      className={`relative ${className ?? ''}`}
      {...props}
    >
      <Bell className="size-5 text-deep-brown" />
      <span
        aria-hidden="true"
        data-state={hasUnread ? 'unread' : 'empty'}
        className={`absolute right-1 top-1 size-2 rounded-full border border-card-surface ${
          hasUnread ? 'bg-soft-orange' : 'bg-card-surface ring-1 ring-border'
        }`}
      />
    </IconButton>
  )
}

export { NotificationButton }
