import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const interactiveCardVariants = cva(
  'text-left outline-none focus-visible:ring-2 focus-visible:ring-sage-green/50 focus-visible:ring-offset-2 focus-visible:ring-offset-warm-beige disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        surface:
          'rounded-card border border-border bg-card-surface shadow-sm transition-[background-color,filter] hover:bg-muted/20 hover:brightness-[0.97] active:bg-muted/40 active:brightness-[0.94]',
        muted: 'rounded-xl bg-muted/60',
        plain: 'rounded-card',
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        default: 'p-4',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'surface',
      padding: 'default',
      fullWidth: true,
    },
  }
)

interface InteractiveCardProps
  extends ComponentProps<'button'>,
    VariantProps<typeof interactiveCardVariants> {}

function InteractiveCard({
  className,
  variant,
  padding,
  fullWidth,
  type = 'button',
  ...props
}: InteractiveCardProps) {
  return (
    <button
      type={type}
      className={cn(interactiveCardVariants({ variant, padding, fullWidth }), className)}
      {...props}
    />
  )
}

export { InteractiveCard, interactiveCardVariants }
