import type { ComponentProps } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

/**
 * Shared expand/collapse chevron (#967). Transparent — no filled chip —
 * so Settings cards and Day section headers cannot drift.
 *
 * Pass `expanded` for a standalone control (Settings). Omit it inside a
 * `group` Collapsible trigger so rotation follows `data-state`.
 */
export function CollapseChevronIcon({
  expanded,
  className,
}: {
  expanded?: boolean
  className?: string
}) {
  return (
    <ChevronDown
      aria-hidden="true"
      data-slot="collapse-chevron"
      className={cn(
        'size-4 shrink-0 bg-transparent text-muted-foreground transition-transform',
        expanded === undefined
          ? 'group-data-[state=open]:rotate-180'
          : expanded && 'rotate-180',
        className,
      )}
    />
  )
}

/** 44px thumb target (#872) with no tile behind the icon. */
export function CollapseChevronButton({
  expanded,
  className,
  ...props
}: {
  expanded: boolean
} & Omit<ComponentProps<'button'>, 'type' | 'children'>) {
  return (
    <button
      type="button"
      data-slot="collapse-chevron-button"
      aria-expanded={expanded}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center bg-transparent text-muted-foreground outline-none select-none hover:bg-transparent focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
      {...props}
    >
      <CollapseChevronIcon expanded={expanded} />
    </button>
  )
}
