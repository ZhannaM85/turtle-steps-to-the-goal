import type { ReactNode } from 'react'
import { CollapseChevronIcon } from '@/shared/ui/collapse-chevron'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { cn } from '@/shared/lib/utils'

/**
 * #876 — one Day section header: title, optional icon/subtitle, one
 * chevron. `shell` is the `section-shell` chrome. Turn it off when the
 * body is already number cards so those are not double-boxed.
 * #1041 — the chevron and the pin share the title line's midline
 * (`min-h-11` / `h-11`). A collapsed summary sits under that row, so it
 * cannot pull the icons down.
 * #1044 — the summary is a full-width row under the title, not inside
 * the trigger column beside the pin.
 */
export function SectionAccordion({
  open,
  onOpenChange,
  title,
  icon,
  subtitle,
  expandLabel,
  collapseLabel,
  actions,
  summary,
  children,
  className,
  id,
  shell = true,
  contentClassName = 'flex flex-col gap-4 pt-4',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  icon?: ReactNode
  subtitle?: ReactNode
  expandLabel: string
  collapseLabel: string
  actions?: ReactNode
  /** Extra row inside the header trigger, e.g. a collapsed summary. */
  summary?: ReactNode
  children: ReactNode
  className?: string
  id?: string
  shell?: boolean
  contentClassName?: string
}) {
  return (
    <div id={id} className={cn(shell && 'section-shell p-3', className)}>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        {/* #1041 — title row only: chevron and pin share that midline.
            #1044 — the summary is the next row, full width, so it runs
            under the pin instead of stopping at the trigger column. */}
        <div className="flex flex-col">
          <div className="flex items-start">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-label={open ? collapseLabel : expandLabel}
                className="group flex min-w-0 flex-1 flex-col text-left"
              >
                <span className="flex min-h-11 items-center gap-1.5">
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium text-foreground">
                    {icon}
                    {title}
                  </span>
                  <span className="inline-flex size-11 shrink-0 items-center justify-center">
                    <CollapseChevronIcon />
                  </span>
                </span>
                {subtitle ? (
                  <span className="text-xs font-normal text-muted-foreground">
                    {subtitle}
                  </span>
                ) : null}
              </button>
            </CollapsibleTrigger>
            {actions ? (
              <span className="flex h-11 shrink-0 items-center">{actions}</span>
            ) : null}
          </div>
          {summary ? (
            // #1043 — air under the stripe, before the next Day section,
            // stays `mb-1.5`. #1047 — no `mt-3` above it; that stacked with
            // the title row and left too much gap under the date header.
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="mb-1.5 block w-full min-w-0 text-left"
              >
                {summary}
              </button>
            </CollapsibleTrigger>
          ) : null}
        </div>
        <CollapsibleContent>
          <div className={contentClassName}>{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
