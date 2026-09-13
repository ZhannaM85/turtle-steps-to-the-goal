import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
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
  children: ReactNode
  className?: string
  id?: string
  shell?: boolean
  contentClassName?: string
}) {
  return (
    <div id={id} className={cn(shell && 'section-shell p-3', className)}>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div className="flex items-start gap-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              aria-label={open ? collapseLabel : expandLabel}
              className="group flex min-w-0 flex-1 flex-col gap-0.5 text-left"
            >
              <span className="flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {icon}
                  {title}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                />
              </span>
              {subtitle ? (
                <span className="text-xs font-normal text-muted-foreground">
                  {subtitle}
                </span>
              ) : null}
            </button>
          </CollapsibleTrigger>
          {actions}
        </div>
        <CollapsibleContent>
          <div className={contentClassName}>{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
