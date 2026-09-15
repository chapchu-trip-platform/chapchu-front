import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MapFlowBottomDockProps {
  children: ReactNode
  className?: string
  expanded: boolean
  testId: string
}

export default function MapFlowBottomDock({
  children,
  className,
  expanded,
  testId,
}: MapFlowBottomDockProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'safe-bottom-action absolute inset-x-0 bottom-0 z-20 h-[156px] min-h-[156px] bg-card-surface px-4 pt-3',
        expanded ? 'rounded-t-none shadow-none' : 'rounded-t-[24px] shadow-xl',
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-border"
      />
      {children}
    </div>
  )
}
