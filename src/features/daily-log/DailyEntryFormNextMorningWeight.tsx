import { ChevronDown, Scale } from 'lucide-react'
import { nextMorningWeight } from '@/domain/dailyEntry'
import { kgToLb } from '@/domain/goal'
import {
  formatExactNumber,
  formatSignedNumber,
  unitLabel,
  useLocale,
} from '@/i18n'
import { useNextDayEntry } from '@/shared/hooks'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
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
    <div className="section-shell p-3">
      <Collapsible
        open={!collapsed}
        onOpenChange={(open) => setCollapsed('nextMorningWeight', !open)}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label={
              collapsed
                ? t.dailyEntry.expandNextMorningWeightCardLabel
                : t.dailyEntry.collapseNextMorningWeightCardLabel
            }
            className="group flex w-full flex-col gap-0.5 text-left"
          >
            <span className="flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Scale aria-hidden="true" className="size-4" />
                {t.dailyEntry.nextMorningWeightCardTitle}
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
              />
            </span>
            <span className="text-xs text-muted-foreground">
              {t.dailyEntry.nextMorningWeightCardHint}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-1 pt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold">
                {formatExactNumber(toDisplay(derived.weightKg), locale)}
              </span>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
            {derived.changeKg !== null && (
              <span className="text-sm text-muted-foreground">
                {formatSignedNumber(toDisplay(derived.changeKg), locale)} {unit}
              </span>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
