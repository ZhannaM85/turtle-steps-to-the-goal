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
        <div
          className={cn(
            'flex items-start gap-2',
            summary && actions && 'relative',
          )}
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              aria-label={open ? collapseLabel : expandLabel}
              className="group flex min-w-0 flex-1 flex-col gap-0.5 text-left"
            >
              <span
                className={cn(
                  'flex items-center justify-between gap-1.5',
                  // Room for the absolute pin so the chevron stays clear.
                  summary && actions && 'pr-14',
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {icon}
                  {title}
                </span>
                <CollapseChevronIcon />
              </span>
              {subtitle ? (
                <span className="text-xs font-normal text-muted-foreground">
                  {subtitle}
                </span>
              ) : null}
              {summary ? (
                // #1032 — clear the title-row pin (icon-touch is 44px,
                // the label line is ~20px) and leave air before the
                // next Day section. The pin sits on the title row only.
                <span className="mt-6 mb-3 block w-full min-w-0">{summary}</span>
              ) : null}
            </button>
          </CollapsibleTrigger>
          {summary && actions ? (
            <div className="absolute top-0 right-0">{actions}</div>
          ) : (
            actions
          )}
        </div>
        <CollapsibleContent>
          <div className={contentClassName}>{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
