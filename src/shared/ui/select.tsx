import * as React from 'react'

import { cn } from '@/shared/lib/utils'

/**
 * #736 — native `<select>` with the same height/chrome as `Input`, so the
 * meal-library sort and custom-correlation pickers are not one-off class
 * strings. Not a Radix combobox: those two call sites are short option
 * lists, and a native select is the right control on a phone.
 */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<'select'>
>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      data-slot="select"
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80',
        className,
      )}
      {...props}
    />
  )
})
Select.displayName = 'Select'

export { Select }
