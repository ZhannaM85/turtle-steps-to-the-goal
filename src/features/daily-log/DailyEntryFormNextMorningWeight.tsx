import { Scale } from 'lucide-react'
import { nextMorningWeight } from '@/domain/dailyEntry'
import { kgToLb } from '@/domain/goal'
import {
  formatExactNumber,
  formatSignedExactNumber,
  unitLabel,
  useLocale,
} from '@/i18n'
import { useNextDayEntry } from '@/shared/hooks'
import { SectionAccordion } from '@/shared/ui/section-accordion'
import { useTodaySectionsCollapseStore, useUnitStore } from '@/stores'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

function asWeightKg(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * #829 — read-only card below Night food: the next calendar day's weigh-in
 * and signed delta vs this day's weight. Hidden when D+1 has no weight
 * (no skip-ahead to a later logged day). Derived only — never stored.
 */
export function DailyEntryFormNextMorningWeight() {
  const state = useDailyEntryFormStateContext()
  const { t, date, weightKg } = state
  const locale = useLocale()
  const displayUnit = useUnitStore((store) => store.unit)
  const nextDayEntry = useNextDayEntry(date)
  const collapsed = useTodaySectionsCollapseStore(
    (s) => s.sections.nextMorningWeight,
  )
  const setCollapsed = useTodaySectionsCollapseStore((s) => s.setCollapsed)
  const derived = nextMorningWeight(
    asWeightKg(weightKg),
    nextDayEntry?.weightKg,
  )

  if (!derived) return null

  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)

  return (
    <SectionAccordion
      open={!collapsed}
      onOpenChange={(open) => setCollapsed('nextMorningWeight', !open)}
      title={t.dailyEntry.nextMorningWeightCardTitle}
      icon={<Scale aria-hidden="true" className="size-4" />}
      subtitle={t.dailyEntry.nextMorningWeightCardHint}
      expandLabel={t.dailyEntry.expandNextMorningWeightCardLabel}
      collapseLabel={t.dailyEntry.collapseNextMorningWeightCardLabel}
      contentClassName="flex flex-col gap-1 pt-4"
    >
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold">
                {formatExactNumber(toDisplay(derived.weightKg), locale)}
              </span>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
            {derived.changeKg !== null && (
              <span className="text-sm text-muted-foreground">
                {formatSignedExactNumber(toDisplay(derived.changeKg), locale)} {unit}
              </span>
            )}
    </SectionAccordion>
  )
}
