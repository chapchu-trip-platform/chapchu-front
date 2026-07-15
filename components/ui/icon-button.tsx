import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const iconButtonVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-full border border-transparent outline-none transition-[color,background-color,border-color,filter] hover:brightness-[0.97] active:brightness-[0.94] focus-visible:ring-2 focus-visible:ring-sage-green/50 focus-visible:ring-offset-2 focus-visible:ring-offset-warm-beige disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        ghost: 'text-warm-gray hover:bg-muted/50 active:bg-muted',
        muted: 'bg-muted text-warm-gray hover:bg-muted/70 active:bg-muted/90',
        primary: 'bg-sage-green text-white hover:bg-sage-green/90 active:bg-sage-green/80',
        danger: 'text-danger hover:bg-danger/10 active:bg-danger/15 focus-visible:ring-danger/40',
      },
      size: {
        sm: 'size-8 [&_svg]:size-3.5',
        default: 'size-9 [&_svg]:size-4',
        lg: 'size-10 [&_svg]:size-5',
      },
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'default',
    },
  }
)

interface IconButtonProps
  extends Omit<ComponentProps<'button'>, 'aria-label'>,
    VariantProps<typeof iconButtonVariants> {
  'aria-label': string
}

function IconButton({ className, variant, size, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { IconButton, iconButtonVariants }
