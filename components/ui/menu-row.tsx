import type { ComponentProps, ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MenuRowProps extends ComponentProps<'button'> {
  icon?: ReactNode
  label: string
  description?: string
  endAdornment?: ReactNode
  danger?: boolean
}

function MenuRow({
  className,
  icon,
  label,
  description,
  endAdornment,
  danger,
  type = 'button',
  ...props
}: MenuRowProps) {
  return (
    <button
      type={type}
      className={cn(
        'flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left outline-none transition-[color,background-color,border-color,filter] last:border-0 hover:bg-muted/50 hover:brightness-[0.97] active:bg-muted active:brightness-[0.94] focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage-green/50 disabled:pointer-events-none disabled:opacity-60',
        className
      )}
      {...props}
    >
      {icon && (
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-full bg-muted', danger && 'bg-danger/10 text-danger')}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[13px] font-medium text-deep-brown', danger && 'text-danger')}>
          {label}
        </span>
        {description && <span className="mt-0.5 block text-[11px] text-warm-gray">{description}</span>}
      </span>
      {endAdornment ?? <ChevronRight className="h-4 w-4 flex-shrink-0 text-warm-gray" />}
    </button>
  )
}

export { MenuRow }
