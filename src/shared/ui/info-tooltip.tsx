import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'

import { cn } from '@/shared/lib/utils'

/** #943 — button/chip + ⓘ : icon follows the control at a fixed 8px gap. */
export const CONTROL_WITH_INFO_CLASS =
  'inline-flex w-fit max-w-full items-center justify-start gap-2'

/** Compact ⓘ so the glyph sits ~8–12px beside the control, not a 44px box. */
export const CONTROL_INFO_TOOLTIP_CLASS = 'size-6'

export function ControlWithInfo({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      data-slot="control-with-info"
      className={cn(CONTROL_WITH_INFO_CLASS, className)}
    >
      {children}
    </span>
  )
}

export interface InfoTooltipProps {
  text: string
  label: string
  className?: string
  /** #422 — overrides the default `Info` glyph, for a caller whose trigger
   * already carries its own meaningful icon (e.g. the date-navigator's
   * checkmark badge) that shouldn't be replaced by a generic "i" just to
   * become tappable. Defaults to `Info` so every existing caller (BMR
   * tooltip, etc.) is unaffected. */
  icon?: ReactNode
}

export function InfoTooltip({
  text,
  label,
  className,
  icon,
}: InfoTooltipProps) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'inline-flex size-11 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
            className,
          )}
        >
          {/* #886 — position against the glyph, not the 44px #872 hit box. */}
          <PopoverPrimitive.Anchor asChild>
            <span className="inline-flex" data-slot="info-tooltip-anchor">
              {icon ?? <Info className="size-3.5" aria-hidden="true" />}
            </span>
          </PopoverPrimitive.Anchor>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="top"
          align="center"
          sideOffset={4}
          className="z-50 max-w-64 whitespace-pre-line rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md outline-none"
        >
          {text}
          <PopoverPrimitive.Arrow className="fill-popover" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
