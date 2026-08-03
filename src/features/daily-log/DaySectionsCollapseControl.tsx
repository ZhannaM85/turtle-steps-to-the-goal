import {
  anyTodaySectionExpanded,
  useCustomMetricStore,
  useTodaySectionsCollapseStore,
  type TodaySectionKey,
} from '@/stores'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

/**
 * #511 — quiet Collapse all / Expand all for Today's top-level section
 * shells. Sits tightly above Morning (not a full `gap-6` peer) so it
 * doesn't add a sparse empty band; only counts sections that are
 * actually on screen (macros/water/custom metrics are conditional).
 */
export function DaySectionsCollapseControl() {
  const state = useDailyEntryFormStateContext()
  const { t } = state
  const sections = useTodaySectionsCollapseStore((s) => s.sections)
  const collapseAll = useTodaySectionsCollapseStore((s) => s.collapseAll)
  const expandAll = useTodaySectionsCollapseStore((s) => s.expandAll)
  const hasCustomMetrics = useCustomMetricStore((s) => s.metrics.length > 0)

  const activeKeys: TodaySectionKey[] = [
    'morning',
    'stats',
    'dayTotals',
    'meals',
    'evening',
  ]
  if (state.dayMacrosSummary || state.dayRemainingMacrosSummary) {
    activeKeys.push('macros')
  }
  if (state.waterTrackingEnabled) {
    activeKeys.push('water')
  }
  if (hasCustomMetrics) {
    activeKeys.push('customMetrics')
  }

  const anyExpanded = anyTodaySectionExpanded(sections, activeKeys)

  return (
    <div className="flex justify-end">
      <button
        type="button"
        className="text-sm text-muted-foreground hover:text-foreground"
        onClick={() => {
          if (anyExpanded) collapseAll()
          else expandAll()
        }}
      >
        {anyExpanded
          ? t.today.collapseAllSectionsLabel
          : t.today.expandAllSectionsLabel}
      </button>
    </div>
  )
}
