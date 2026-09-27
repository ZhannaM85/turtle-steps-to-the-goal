import { SectionAccordion } from '@/shared/ui/section-accordion'
import { StatCard } from '@/shared/ui/stat-card'
import { formatNumber } from '@/i18n'
import { useTodaySectionsCollapseStore } from '@/stores'
import { DayPinFrame, DaySectionPinButton } from './DaySectionPin'
import { DayMacrosCompactSummary } from './DayMacrosCompactSummary'
import { formatDayKcalStrip } from './dayKcalStripModel'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

/**
 * #467 / #1029 — Day КБЖУ cards. Collapsed, the header keeps the same
 * compact consumed · remaining line as the sticky strip. A pin keeps
 * this section first in the Day list; it sticks only while collapsed.
 */
export function DayMacrosSection() {
  const state = useDailyEntryFormStateContext()
  const { t, locale } = state
  const macrosCollapsed = useTodaySectionsCollapseStore(
    (s) => s.sections.macros,
  )
  const setCollapsed = useTodaySectionsCollapseStore((s) => s.setCollapsed)

  if (!state.dayMacrosSummary && !state.dayRemainingMacrosSummary) return null

  const text = formatDayKcalStrip({
    consumedKcal: state.dayTotalCalories,
    remainingKcal: state.remainingKcal,
    proteinG: state.consumedProteinG,
    fatG: state.consumedFatG,
    carbG: state.consumedCarbG,
    locale,
    t,
  })
  const compactLabel = text.macros ? `${text.kcal} · ${text.macros}` : text.kcal

  return (
    <DayPinFrame id="macros" stick={macrosCollapsed}>
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
