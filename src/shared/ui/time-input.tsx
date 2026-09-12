import * as React from 'react'

import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'

export interface TimeInputProps extends Omit<
  React.ComponentProps<'input'>,
  'type'
> {
  /** Fill a parent chrome box (Add meal header) instead of a standalone h-12 field. */
  compact?: boolean
}

/**
 * Safari-safe native clock (#859).
 *
 * #856 — `appearance-none` so width classes actually apply on iOS Safari
 * (`input[type=time]` otherwise keeps an intrinsic width).
 * #857 — flex + leading-normal so the value sits in the vertical middle
 * (Safari otherwise paints the digits high in the box).
 *
 * Layout only — does not change native picker behavior.
 */
export const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ className, compact = false, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="time"
        className={cn(
          'flex items-center appearance-none leading-normal [-webkit-appearance:none]',
          compact ? 'h-full w-24' : 'h-12',
          className,
        )}
        {...props}
      />
    )
  },
)
TimeInput.displayName = 'TimeInput'
