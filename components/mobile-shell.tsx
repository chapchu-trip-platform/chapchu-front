import { cn } from '@/lib/utils'

interface MobileShellProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export default function MobileShell({ children, className, noPadding }: MobileShellProps) {
  return (
    <div className="min-h-screen bg-warm-beige flex justify-center">
      <div
        className={cn(
          'relative w-full max-w-[390px] min-h-screen bg-background flex flex-col shadow-2xl',
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
