import { Sun } from 'lucide-react'
import { SectionAccordion } from '@/shared/ui/section-accordion'
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
    <SectionAccordion
      open={!collapsed}
      onOpenChange={(open) => setCollapsed('morning', !open)}
      title={t.dailyEntry.morningEntriesTitle}
      icon={<Sun aria-hidden="true" className="size-4" />}
      subtitle={t.dailyEntry.morningEntriesSubtitle}
      expandLabel={t.dailyEntry.expandMorningEntriesLabel}
      collapseLabel={t.dailyEntry.collapseMorningEntriesLabel}
    >
      <DailyEntryFormMorningWeightField />
      <DailyEntryFormMorningSleepField />
      <DailyEntryFormMorningMeasurementsField />
      <DailyEntryFormMorningCompositionField />
      <DailyEntryFormMorningNoteField />
    </SectionAccordion>
  )
}
