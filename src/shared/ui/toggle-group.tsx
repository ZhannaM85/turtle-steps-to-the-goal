import * as React from 'react'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'

import { cn } from '@/shared/lib/utils'

/** Muted wrapping track: selected pill is `bg-card` + `shadow-sm`. */
export const TOGGLE_GROUP_CLASS =
  'inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1'

export const TOGGLE_GROUP_ITEM_CLASS =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground whitespace-nowrap outline-none transition-colors select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm'

/**
 * #951 — Settings → Export period chrome on top of {@link TOGGLE_GROUP_CLASS}.
 * `flex` makes the muted track full-width so wrapping pills share one well.
 */
export const TOGGLE_GROUP_PERIOD_CLASS = 'flex flex-wrap justify-start'

/** 48px Export / Settings period pills (#194 / #951). */
export const TOGGLE_GROUP_PERIOD_ITEM_CLASS = 'h-12'

function ToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn(TOGGLE_GROUP_CLASS, className)}
      {...props}
    />
  )
}

function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(TOGGLE_GROUP_ITEM_CLASS, className)}
      {...props}
    />
  )
}

/** Same segmented control as Settings → Export period (#951). */
function PeriodToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroup
      className={cn(TOGGLE_GROUP_PERIOD_CLASS, className)}
      {...props}
    />
  )
}

function PeriodToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupItem
      className={cn(TOGGLE_GROUP_PERIOD_ITEM_CLASS, className)}
      {...props}
    />
  )
}

export {
  ToggleGroup,
  ToggleGroupItem,
  PeriodToggleGroup,
  PeriodToggleGroupItem,
}
