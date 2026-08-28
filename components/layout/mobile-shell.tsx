import { cn } from '@/lib/utils'

interface MobileShellProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export default function MobileShell({ children, className, noPadding }: MobileShellProps) {
  return (
    <div className="flex min-h-dvh justify-center bg-warm-beige">
      <div
        className={cn(
          'relative flex min-h-dvh w-full max-w-[430px] flex-col overflow-x-hidden bg-background shadow-2xl',
          noPadding ? 'p-0' : undefined,
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
