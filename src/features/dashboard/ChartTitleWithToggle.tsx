import { Eye, EyeOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import {
  useDashboardChartVisibilityStore,
  type DashboardChartKey,
} from '@/stores'

export interface ChartTitleWithToggleProps {
  chart: DashboardChartKey
  title: string
  /** An extra control to render next to the eye toggle (#247) — e.g. a
   * correlation card's own "Show chart"/chevron expand button. Rendered
   * only while the card itself is visible; the caller is responsible for
   * that (same as everything else below the title). */
  extraAction?: ReactNode
}

/**
 * #245 — a per-chart show/hide toggle next to its title, for the three
 * trend charts (Weight/Calorie/Macro). Shared across all three rather than
 * duplicated inline since the accessibility shape (aria-pressed label that
 * flips with state) needs to stay identical everywhere it's used. Always
 * rendered by its caller regardless of the chart's own visibility state —
 * the #238 lesson applies here too: the control that turns a section back
 * on can never be the thing hidden along with it.
 */
export function ChartTitleWithToggle({
  chart,
  title,
  extraAction,
}: ChartTitleWithToggleProps) {
  const t = useTranslation()
  const visible = useDashboardChartVisibilityStore(
    (state) => state.visible[chart],
  )
  const toggleVisible = useDashboardChartVisibilityStore(
    (state) => state.toggleVisible,
  )

  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="flex items-center gap-1">
        {extraAction}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-pressed={visible}
          aria-label={
            visible ? t.dashboard.hideChartLabel(title) : t.dashboard.showChartLabel(title)
          }
          onClick={() => toggleVisible(chart)}
        >
          {visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
        </Button>
      </div>
    </div>
  )
}
