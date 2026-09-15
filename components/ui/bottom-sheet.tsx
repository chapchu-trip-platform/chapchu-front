import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

function BottomSheetRoot({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('absolute inset-0 z-50 flex flex-col justify-end', className)}
      {...props}
    />
  )
}

function BottomSheetBackdrop({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('absolute inset-0 bg-black/40', className)} {...props} />
}

function BottomSheetSurface({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-t-[24px] bg-card-surface',
        className
      )}
      {...props}
    />
  )
}

function BottomSheetHandle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('flex justify-center pb-1 pt-3', className)} {...props}>
      <div className="h-1 w-10 rounded-full bg-border" />
    </div>
  )
}

export { BottomSheetBackdrop, BottomSheetHandle, BottomSheetRoot, BottomSheetSurface }
