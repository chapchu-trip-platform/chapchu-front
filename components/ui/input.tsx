import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const inputVariants = cva(
  'w-full rounded-card border border-border bg-card text-[14px] text-deep-brown outline-none transition-shadow placeholder:text-warm-gray focus:ring-2 focus:ring-sage-green/50 disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-danger aria-invalid:ring-danger/30',
  {
    variants: {
      size: {
        compact: 'h-11 px-3',
        default: 'h-12 px-4',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

interface InputProps extends Omit<ComponentProps<'input'>, 'size'>, VariantProps<typeof inputVariants> {}

function Input({ className, size, ...props }: InputProps) {
  return <input className={cn(inputVariants({ size }), className)} {...props} />
}

function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'w-full resize-none rounded-card border border-border bg-card p-4 text-[14px] text-deep-brown outline-none transition-shadow placeholder:text-warm-gray focus:ring-2 focus:ring-sage-green/50 disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-danger aria-invalid:ring-danger/30',
        className
      )}
      {...props}
    />
  )
}

export { Input, Textarea, inputVariants }
