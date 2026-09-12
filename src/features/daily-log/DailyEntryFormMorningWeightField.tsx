import { formatExactNumber } from '@/i18n'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  EntryFieldComparisonInfo,
  EntryFieldComparisonLive,
} from './EntryFieldComparison'
import {
  DayFieldEditActions,
  DayFieldHeader,
  DayFieldViewActions,
} from './DayFieldHeader'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

/** Weight field extracted from DailyEntryFormMorning (#864). Markup unchanged. */
export function DailyEntryFormMorningWeightField() {
  const state = useDailyEntryFormStateContext()
  const { t, locale } = state
  const comparison = state.entryComparisonBaselines

  return (
    <>
            {state.isConfirmingDeleteWeight ? (
              // #670 — same two-step inline confirm shape as
              // MealListItem's/EntryRow's own confirmDelete states (muted
              // label + destructive Yes / ghost No) rather than a modal.
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  {t.dailyEntry.weightLabel}
                </span>
                <div className="flex min-h-12 items-center gap-2 rounded-lg bg-muted px-3 py-2">
                  <span className="text-sm text-muted-foreground">
                    {t.history.confirmDeleteLabel}
                  </span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={state.confirmDeleteWeight}
                  >
                    {t.history.confirmDeleteYes}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={state.cancelDeleteWeight}
                  >
                    {t.history.confirmDeleteNo}
                  </Button>
                </div>
              </div>
            ) : state.showWeightAsDisplay ? (
              <div className="flex flex-col gap-1.5">
                {/* #798 / #858 — pencil + trash on the title row (same as
                 * Sleep #752 / Body composition #750) so they stack in
                 * one column. Large #516 value stays in the muted card. */}
                <DayFieldHeader
                  label={
                    <>
                      {t.dailyEntry.weightLabel}
                      <EntryFieldComparisonInfo
                        field="weightKg"
                        currentValue={state.weightKg}
                        prior={comparison.prior('weightKg')}
                        day30Value={comparison.day30Value('weightKg')}
                        unit="kg"
                      />
                    </>
                  }
                  actions={
                    <DayFieldViewActions
                      editLabel={t.dailyEntry.editWeightLabel}
                      onEdit={() => state.setIsEditingWeight(true)}
                      deleteLabel={t.dailyEntry.deleteWeightLabel}
                      onDelete={state.requestDeleteWeight}
                      showDelete={state.canDeleteWeight}
                    />
                  }
                />
                <div className="flex min-h-12 items-center rounded-lg bg-muted px-3 py-2">
                  {/* #516 — Weight is the Day screen's primary morning
                   * figure (unlike body composition's five peers). Value
                   * sized up so the hierarchy is obvious at a glance. */}
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <span className="text-2xl font-semibold tabular-nums text-foreground">
                      {formatExactNumber(state.weightKg!, locale)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t.common.kg}
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <DayFieldHeader
                  label={t.dailyEntry.weightLabel}
                  actions={
                    <DayFieldEditActions
                      saveLabel={t.dailyEntry.saveWeightLabel}
                      onSave={state.saveWeight}
                      cancelLabel={t.dailyEntry.cancelEditWeightLabel}
                      onCancel={state.cancelEditWeight}
                      showCancel={state.canCancelWeightEdit}
                      deleteLabel={t.dailyEntry.deleteWeightLabel}
                      onDelete={state.requestDeleteWeight}
                      showDelete={state.canDeleteWeight}
                    />
                  }
                />
                <Input
                  type="text"
                  inputMode="decimal"
                  aria-label={t.dailyEntry.weightLabel}
                  aria-invalid={state.errors.weightKg ? true : undefined}
                  className="h-12 w-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      state.saveWeight()
                    }
                  }}
                  {...state.register('weightKg', {
                    setValueAs: parseNumberInput,
                  })}
                />
                <EntryFieldComparisonLive
                  field="weightKg"
                  currentValue={state.weightKg}
                  prior={comparison.prior('weightKg')}
                  unit="kg"
                />
                {state.errors.weightKg && (
                  <p className="text-sm text-destructive">
                    {state.errors.weightKg.message}
                  </p>
                )}
                {/* #218: soft warning, not a hard block — weightSchema's own
                 * 20-400kg range already rejects an outright-impossible value
                 * before this ever renders; this catches a value still inside
                 * that range but unusual enough to likely be a typo (e.g. an
                 * extra digit). A second Save tap (same value) commits it
                 * anyway; Fix it just dismisses the warning to keep editing. */}
                {state.pendingUnusualWeight !== null && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-destructive">
                      {t.dailyEntry.unusualWeightWarning}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={state.saveWeight}
                      >
                        {t.dailyEntry.saveUnusualWeightAnywayLabel}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={state.discardUnusualWeightWarning}
                      >
                        {t.dailyEntry.fixWeightLabel}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
    </>
  )
}
