import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

function ModalActions({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex gap-2 [&>*]:flex-1', className)} {...props} />
}

export { ModalActions }
