import { ChevronDown, Sun } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { useTodaySectionsCollapseStore } from '@/stores'
import { DailyEntryFormMorningCompositionField } from './DailyEntryFormMorningCompositionField'
import { DailyEntryFormMorningMeasurementsField } from './DailyEntryFormMorningMeasurementsField'
import { DailyEntryFormMorningNoteField } from './DailyEntryFormMorningNoteField'
import { DailyEntryFormMorningSleepField } from './DailyEntryFormMorningSleepField'
import { DailyEntryFormMorningWeightField } from './DailyEntryFormMorningWeightField'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

/**
 * #419 — the "Morning entries" group (Weight/Sleep/Body measurements/Body
 * composition, #404), split out of `DailyEntryFormTop.tsx` so it can render
 * on its own, right after `TodayScreen.tsx`'s Goal target card — reported
 * live as buried at the bottom of the page, past BMI/the deltas/the whole
 * reorderable stat-card group. `DailyEntryForm.tsx` (the combined default,
 * used by History's `EntryRow.tsx`) renders this first, immediately
 * followed by `DailyEntryFormTop` (Meals/Water) and `DailyEntryFormBottom`
 * (Evening) — unchanged there, still one contiguous block.
 *
 * #864 — field blocks live in `DailyEntryFormMorning*Field.tsx` so this
 * shell stays under the 500-line ceiling. Markup and state wiring unchanged.
 */
export function DailyEntryFormMorning() {
  const state = useDailyEntryFormStateContext()
  const { t } = state
  // #472/#511 — accordion; collapse shared with Day Collapse all control.
  const collapsed = useTodaySectionsCollapseStore(
    (s) => s.sections.morning,
  )
  const setCollapsed = useTodaySectionsCollapseStore((s) => s.setCollapsed)

  return (
    <div className="section-shell p-3">
      <Collapsible
        open={!collapsed}
        onOpenChange={(open) => setCollapsed('morning', !open)}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label={
              collapsed
                ? t.dailyEntry.expandMorningEntriesLabel
                : t.dailyEntry.collapseMorningEntriesLabel
            }
            className="group flex w-full flex-col gap-0.5 text-left"
          >
            <span className="flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Sun aria-hidden="true" className="size-4" />
                {t.dailyEntry.morningEntriesTitle}
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
              />
            </span>
            <span className="text-xs text-muted-foreground">
              {t.dailyEntry.morningEntriesSubtitle}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-4 pt-4">
            <DailyEntryFormMorningWeightField />
            <DailyEntryFormMorningSleepField />
            <DailyEntryFormMorningMeasurementsField />
            <DailyEntryFormMorningCompositionField />
            <DailyEntryFormMorningNoteField />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
