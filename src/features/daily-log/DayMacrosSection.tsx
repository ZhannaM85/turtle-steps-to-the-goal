import { SectionAccordion } from '@/shared/ui/section-accordion'
import { StatCard } from '@/shared/ui/stat-card'
import { formatNumber } from '@/i18n'
import { useTodaySectionsCollapseStore } from '@/stores'
import { DayPinFrame, DaySectionPinButton } from './DaySectionPin'
import { DayMacrosCompactSummary } from './DayMacrosCompactSummary'
import { formatDayKcalStrip } from './dayKcalStripModel'
import { useMacrosAutoCollapse } from './macrosAutoCollapse'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

/**
 * #467 / #1029 — Day КБЖУ cards. Collapsed, the header keeps the same
 * eaten/goal line as the sticky strip (#1034). A pin keeps this section
 * first in the Day list. #1049 — a pinned row stays sticky when expanded
 * too, with a higher z-index, so opening the stripe paints the cards over
 * the content below instead of scrolling the page (#1048). #1036 — a
 * downward scroll collapses the expanded cards (including while sticky).
 * #1038 — scrolling back up opens that automatic collapse once the row
 * has left the stick line; a chevron close stays closed.
 * #1039 — `pt-3` on this card when expanded so the title row is not
 * flush with the top edge. #1046 — drop that padding while collapsed
 * so the gap under the date header is not doubled up with the stripe.
 * The collapsed stripe keeps its padding and wraps (#1041) instead of
 * clipping at the card edge.
 * #1043 — outer gaps only. The eaten/remaining stack is the pre-#1042
 * `gap-6` and default card padding again (#1042 had halved that stack).
 */
export function DayMacrosSection() {
  const state = useDailyEntryFormStateContext()
  const { t, locale } = state
  const macrosCollapsed = useTodaySectionsCollapseStore(
    (s) => s.sections.macros,
  )
  const setCollapsed = useTodaySectionsCollapseStore((s) => s.setCollapsed)
  const hasSummary = Boolean(
    state.dayMacrosSummary || state.dayRemainingMacrosSummary,
  )
  useMacrosAutoCollapse(macrosCollapsed, hasSummary)

  if (!hasSummary) return null

  const text = formatDayKcalStrip({
    consumedKcal: state.dayTotalCalories,
    kcalTarget: state.dailyCalorieTargetKcal,
    proteinG: state.consumedProteinG,
    proteinTargetG: state.dailyProteinTargetG,
    fatG: state.consumedFatG,
    fatTargetG: state.dailyFatTargetG,
    carbG: state.consumedCarbG,
    carbTargetG: state.dailyCarbTargetG,
    locale,
    t,
  })
  const compactLabel = text.macros ? `${text.kcal} · ${text.macros}` : text.kcal

  return (
    <DayPinFrame id="macros" stick>
      <SectionAccordion
        open={!macrosCollapsed}
        onOpenChange={(open) => setCollapsed('macros', !open)}
        title={t.dailyEntry.macrosLabel}
        expandLabel={
          macrosCollapsed
            ? `${t.dailyEntry.expandMacrosLabel}: ${compactLabel}`
            : t.dailyEntry.expandMacrosLabel
        }
        collapseLabel={t.dailyEntry.collapseMacrosLabel}
        shell={false}
        className={macrosCollapsed ? undefined : 'pt-3'}
        contentClassName="flex flex-col gap-6 pt-3"
        actions={<DaySectionPinButton id="macros" />}
        summary={
          macrosCollapsed ? (
            <DayMacrosCompactSummary kcal={text.kcal} macros={text.macros} />
          ) : null
        }
      >
        {state.dayMacrosSummary && (
          <StatCard
            label={t.dailyEntry.consumedMacrosLabel}
            value={formatNumber(state.dayTotalCalories, locale, 0)}
            unit={t.dailyEntry.kcalUnit}
            description={state.dayMacrosDescription ?? undefined}
          />
        )}
        {state.dayRemainingMacrosSummary && (
          <StatCard
            label={t.dailyEntry.remainingMacrosLabel}
            value={
              state.remainingKcal !== undefined
                ? formatNumber(state.remainingKcal, locale, 0)
                : '—'
            }
            unit={t.dailyEntry.kcalUnit}
            description={state.dayRemainingMacrosDescription ?? undefined}
          />
        )}
      </SectionAccordion>
    </DayPinFrame>
  )
}
