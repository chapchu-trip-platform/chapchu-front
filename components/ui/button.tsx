import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-btn border border-transparent font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sage-green/50 focus-visible:ring-offset-2 focus-visible:ring-offset-warm-beige disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-sage-green text-white hover:bg-sage-green/90 active:bg-sage-green/80',
        outline: 'border-border bg-card-surface text-deep-brown hover:bg-muted/50 active:bg-muted',
        secondary: 'border-border bg-muted text-deep-brown hover:bg-muted/70 active:bg-muted/90',
        ghost: 'bg-transparent text-warm-gray hover:bg-muted/50 active:bg-muted',
        destructive:
          'bg-danger text-white hover:bg-danger/90 active:bg-danger/80 focus-visible:ring-danger/40',
        soft:
          'bg-sage-green-light text-sage-green hover:bg-sage-green-light/75 active:bg-sage-green-light/60',
        link: 'text-sage-green underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 gap-2 px-4 text-[14px]',
        sm: 'h-9 gap-1.5 px-3 text-[13px]',
        lg: 'h-12 gap-2 px-4 text-[15px]',
        icon: 'size-10 rounded-full',
        'icon-sm': 'size-8 rounded-full [&_svg:not([class*="size-"])]:size-3.5',
        'icon-lg': 'size-12 rounded-full [&_svg:not([class*="size-"])]:size-5',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  fullWidth = false,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, fullWidth, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
