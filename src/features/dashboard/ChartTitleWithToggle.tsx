import type { ReactNode } from 'react'
import { useTranslation } from '@/i18n'
import { SectionTitleWithToggle } from '@/shared/ui/section-title-with-toggle'
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
 * #245 — a per-chart show/hide toggle next to its title, for every
 * Dashboard section. Thin wrapper around the store-agnostic
 * `SectionTitleWithToggle` (#232), wiring it up to
 * `dashboardChartVisibilityStore` specifically — Today/Goal's own
 * sections use that same shared component directly, wired to their own
 * `sectionVisibilityStore` instead.
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
    <SectionTitleWithToggle
      title={title}
      visible={visible}
      onToggle={() => toggleVisible(chart)}
      hideLabel={t.dashboard.hideChartLabel(title)}
      showLabel={t.dashboard.showChartLabel(title)}
      extraAction={extraAction}
    />
  )
}
