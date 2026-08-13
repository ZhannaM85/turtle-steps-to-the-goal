import type { ReactNode } from 'react'
import type { DashboardChartKey } from '@/stores'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'

export interface EmptyDashboardSectionProps {
  chart: DashboardChartKey
  title: string
  description: string
  dragHandle?: ReactNode
  /** When false, title + eye only (same as other cards after hide). */
  visible: boolean
}

/**
 * #708 — keep a Dashboard section visible when it has no data to plot,
 * instead of `return null` (which read as the graph being deleted).
 */
export function EmptyDashboardSection({
  chart,
  title,
  description,
  dragHandle,
  visible,
}: EmptyDashboardSectionProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
      <ChartTitleWithToggle
        chart={chart}
        title={title}
        dragHandle={dragHandle}
      />
      {visible && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
