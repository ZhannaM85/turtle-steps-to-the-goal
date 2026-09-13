import { isBlankSaveValue } from '@/shared/lib/isBlankSaveValue'
import { NumberInput } from '@/shared/ui/number-input'
import { SectionAccordion } from '@/shared/ui/section-accordion'
import { useTodaySectionsCollapseStore } from '@/stores'
import { ConfirmDeleteEntryBar } from './ConfirmDeleteEntryBar'
import {
  DayFieldEditActions,
  DayFieldHeader,
  DayFieldViewActions,
} from './DayFieldHeader'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

/**
 * #549/#575 day-level kcal/macros, plus #860 title-row actions and
 * confirm-before-clear (same chrome as Weight / notes / steps).
 */
export function DayTotalsSection() {
  const state = useDailyEntryFormStateContext()
  const { t } = state
  const collapsed = useTodaySectionsCollapseStore((s) => s.sections.dayTotals)
  const setCollapsed = useTodaySectionsCollapseStore((s) => s.setCollapsed)
  const hasSaved = state.dayTotals !== undefined

  if (!state.trackedFields.dayTotals) return null

  return (
    <SectionAccordion
      open={!collapsed}
      onOpenChange={(open) => setCollapsed('dayTotals', !open)}
      title={t.dailyEntry.dayTotalsLabel}
      expandLabel={t.dailyEntry.expandDayTotalsLabel}
      collapseLabel={t.dailyEntry.collapseDayTotalsLabel}
      contentClassName="flex flex-col gap-3 pt-3"
    >
            {state.isConfirmingDeleteDayTotals ? (
              <ConfirmDeleteEntryBar
                label={t.dailyEntry.confirmDeleteDayTotalsLabel}
                onConfirm={state.confirmDeleteDayTotals}
                onCancel={state.cancelDeleteDayTotals}
              />
            ) : state.isEditingDayTotals || !hasSaved ? (
              <>
                <DayFieldHeader
                  label={
                    <span className="text-xs font-normal text-muted-foreground">
                      {t.dailyEntry.dayTotalsHint}
                    </span>
                  }
                  actions={
                    <DayFieldEditActions
                      saveLabel={t.dailyEntry.saveDayTotalsLabel}
                      onSave={state.saveDayTotals}
                      saveDisabled={isBlankSaveValue(state.dayTotalsKcalInput)}
                      cancelLabel={t.dailyEntry.cancelEditDayTotalsLabel}
                      onCancel={state.cancelEditDayTotals}
                      showCancel={hasSaved}
                      deleteLabel={t.dailyEntry.deleteDayTotalsLabel}
                      onDelete={state.requestDeleteDayTotals}
                      showDelete={hasSaved}
                    />
                  }
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberInput
                    label={t.dailyEntry.dayTotalsKcalLabel}
                    unit={t.dailyEntry.kcalUnit}
                    inputMode="numeric"
                    value={state.dayTotalsKcalInput}
                    onChange={(e) =>
                      state.setDayTotalsKcalInput(e.target.value)
                    }
                  />
                  <NumberInput
                    label={t.dailyEntry.dayTotalsProteinLabel}
                    unit={t.dailyEntry.gramsUnit}
                    inputMode="numeric"
                    value={state.dayTotalsProteinInput}
                    onChange={(e) =>
                      state.setDayTotalsProteinInput(e.target.value)
                    }
                  />
                  <NumberInput
                    label={t.dailyEntry.dayTotalsFatLabel}
                    unit={t.dailyEntry.gramsUnit}
                    inputMode="numeric"
                    value={state.dayTotalsFatInput}
                    onChange={(e) =>
                      state.setDayTotalsFatInput(e.target.value)
                    }
                  />
                  <NumberInput
                    label={t.dailyEntry.dayTotalsCarbsLabel}
                    unit={t.dailyEntry.gramsUnit}
                    inputMode="numeric"
                    value={state.dayTotalsCarbsInput}
                    onChange={(e) =>
                      state.setDayTotalsCarbsInput(e.target.value)
                    }
                  />
                  {state.trackedFields.fiber && (
                    <NumberInput
                      label={t.dailyEntry.dayTotalsFiberLabel}
                      unit={t.dailyEntry.gramsUnit}
                      inputMode="numeric"
                      value={state.dayTotalsFiberInput}
                      onChange={(e) =>
                        state.setDayTotalsFiberInput(e.target.value)
                      }
                    />
                  )}
                </div>
                {state.dayTotalsError && (
                  <p className="text-sm text-destructive">
                    {state.dayTotalsError}
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <DayFieldHeader
                  label={
                    <span className="text-xs font-normal text-muted-foreground">
                      {t.dailyEntry.dayTotalsHint}
                    </span>
                  }
                  actions={
                    <DayFieldViewActions
                      editLabel={t.dailyEntry.editDayTotalsLabel}
                      onEdit={state.startEditDayTotals}
                      deleteLabel={t.dailyEntry.deleteDayTotalsLabel}
                      onDelete={state.requestDeleteDayTotals}
                      showDelete
                    />
                  }
                />
                {state.dayTotalsSavedSummary && (
                  <p className="text-sm">{state.dayTotalsSavedSummary}</p>
                )}
              </div>
            )}
    </SectionAccordion>
  )
}
