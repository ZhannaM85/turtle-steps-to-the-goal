import { useTranslation } from '@/i18n'
import {
  DEFAULT_DASHBOARD_SECTION_ORDER,
  useDashboardChartVisibilityStore,
  type DashboardChartKey,
} from '@/stores'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { dashboardChartTitle } from './dashboardChartTitle'

/**
 * #709 — Settings catalog of every built-in Dashboard section, wired to the
 * same `dashboardChartVisibilityStore` the per-card eye toggles use.
 */
export function DashboardChartsVisibilitySection() {
  const t = useTranslation()
  const visible = useDashboardChartVisibilityStore((state) => state.visible)
  const toggleVisible = useDashboardChartVisibilityStore(
    (state) => state.toggleVisible,
  )

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm text-muted-foreground">
        {t.settings.dashboardChartsDescription}
      </span>
      <ul className="flex flex-col gap-3">
        {DEFAULT_DASHBOARD_SECTION_ORDER.map((key: DashboardChartKey) => {
          const title = dashboardChartTitle(key, t)
          return (
            <li
              key={key}
              className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <span className="text-sm">{title}</span>
              <ToggleGroup
                type="single"
                aria-label={title}
                value={visible[key] ? 'on' : 'off'}
                onValueChange={(value) => {
                  if (!value) return
                  const shouldBeOn = value === 'on'
                  if (shouldBeOn !== visible[key]) toggleVisible(key)
                }}
                className="shrink-0"
              >
                <ToggleGroupItem value="off" className="h-12">
                  {t.settings.dashboardChartsOff}
                </ToggleGroupItem>
                <ToggleGroupItem value="on" className="h-12">
                  {t.settings.dashboardChartsOn}
                </ToggleGroupItem>
              </ToggleGroup>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
