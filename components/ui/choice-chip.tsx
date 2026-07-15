import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const choiceChipVariants = cva(
  'inline-flex shrink-0 items-center justify-center border font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sage-green/50 focus-visible:ring-offset-2 focus-visible:ring-offset-warm-beige disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      selected: {
        true: 'text-white',
        false: 'border-border bg-card text-warm-gray hover:bg-muted/50 active:bg-muted',
      },
      tone: {
        sage: '',
        orange: '',
      },
      size: {
        sm: 'h-8 px-3 text-[12px]',
        default: 'h-9 px-4 text-[13px]',
        segment: 'h-11 flex-1 px-4 text-[13px]',
      },
      shape: {
        pill: 'rounded-full',
        card: 'rounded-card',
      },
    },
    compoundVariants: [
      { selected: true, tone: 'sage', className: 'border-sage-green bg-sage-green' },
      { selected: true, tone: 'orange', className: 'border-soft-orange bg-soft-orange' },
    ],
    defaultVariants: {
      selected: false,
      tone: 'sage',
      size: 'default',
      shape: 'pill',
    },
  }
)

interface ChoiceChipProps
  extends Omit<ComponentProps<'button'>, 'aria-pressed'>,
    VariantProps<typeof choiceChipVariants> {
  selected?: boolean
}

function ChoiceChip({
  className,
  selected = false,
  tone,
  size,
  shape,
  type = 'button',
  ...props
}: ChoiceChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(choiceChipVariants({ selected, tone, size, shape }), className)}
      {...props}
    />
  )
}

export { ChoiceChip, choiceChipVariants }
