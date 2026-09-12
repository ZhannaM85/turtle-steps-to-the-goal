import { formatExactNumber } from '@/i18n'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  DayFieldEditActions,
  DayFieldHeader,
  DayFieldViewActions,
} from './DayFieldHeader'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

/** Body-measurements field extracted from DailyEntryFormMorning (#864). */
export function DailyEntryFormMorningMeasurementsField() {
  const state = useDailyEntryFormStateContext()
  const { t, locale } = state

  return (
    <>
            {/* #225: waist/hip/body fat bundled under one edit toggle, same
             * shape as the Sleep block above (one label, one Save button,
             * several sub-inputs) rather than three separate top-level fields
             * — these are all "the same kind of thing" (an occasional body
             * measurement), so a user updating one is likely updating the
             * others at the same time. #404: in the Morning group, alongside
             * Body composition — both are physical measurements typically
             * taken in the morning, same as Weight. */}
            {state.trackedFields.bodyMeasurements &&
              (state.isConfirmingDeleteBodyMeasurements ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.dailyEntry.bodyMeasurementsLabel}
                  </span>
                  <div className="flex min-h-12 items-center gap-2 rounded-lg bg-muted px-3 py-2">
                    <span className="text-sm text-muted-foreground">
                      {t.history.confirmDeleteLabel}
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={state.confirmDeleteBodyMeasurements}
                    >
                      {t.history.confirmDeleteYes}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={state.cancelDeleteBodyMeasurements}
                    >
                      {t.history.confirmDeleteNo}
                    </Button>
                  </div>
                </div>
              ) : state.showBodyMeasurementsAsDisplay ? (
                <div className="flex flex-col gap-1.5">
                  <DayFieldHeader
                    label={t.dailyEntry.bodyMeasurementsLabel}
                    actions={
                      <DayFieldViewActions
                        editLabel={t.dailyEntry.editBodyMeasurementsLabel}
                        onEdit={() =>
                          state.setIsEditingBodyMeasurements(true)
                        }
                        deleteLabel={t.dailyEntry.deleteBodyMeasurementsLabel}
                        onDelete={state.requestDeleteBodyMeasurements}
                        showDelete={state.canDeleteBodyMeasurements}
                      />
                    }
                  />
                  <div className="flex h-12 items-center rounded-lg bg-muted px-3">
                    <span className="text-sm text-foreground">
                      {t.dailyEntry.bodyMeasurementsSummary(
                        state.waistCm === undefined
                          ? '—'
                          : `${formatExactNumber(state.waistCm, locale)}${t.dailyEntry.cmUnit}`,
                        state.hipCm === undefined
                          ? '—'
                          : `${formatExactNumber(state.hipCm, locale)}${t.dailyEntry.cmUnit}`,
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <DayFieldHeader
                    label={t.dailyEntry.bodyMeasurementsLabel}
                    actions={
                      <DayFieldEditActions
                        saveLabel={t.dailyEntry.saveBodyMeasurementsLabel}
                        onSave={state.saveBodyMeasurements}
                        cancelLabel={
                          t.dailyEntry.cancelEditBodyMeasurementsLabel
                        }
                        onCancel={state.cancelEditBodyMeasurements}
                        showCancel={state.canCancelBodyMeasurementsEdit}
                        deleteLabel={t.dailyEntry.deleteBodyMeasurementsLabel}
                        onDelete={state.requestDeleteBodyMeasurements}
                        showDelete={state.canDeleteBodyMeasurements}
                      />
                    }
                  />
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <Label>{t.dailyEntry.waistLabel}</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${t.dailyEntry.waistLabel} (${t.dailyEntry.cmUnit})`}
                          aria-invalid={state.errors.waistCm ? true : undefined}
                          className="h-12 w-16"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveBodyMeasurements()
                            }
                          }}
                          {...state.register('waistCm', {
                            setValueAs: parseNumberInput,
                          })}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.cmUnit}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>{t.dailyEntry.hipLabel}</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${t.dailyEntry.hipLabel} (${t.dailyEntry.cmUnit})`}
                          aria-invalid={state.errors.hipCm ? true : undefined}
                          className="h-12 w-16"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveBodyMeasurements()
                            }
                          }}
                          {...state.register('hipCm', {
                            setValueAs: parseNumberInput,
                          })}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.cmUnit}
                        </span>
                      </div>
                    </div>
                  </div>
                  {(state.errors.waistCm || state.errors.hipCm) && (
                    <p className="text-sm text-destructive">
                      {state.errors.waistCm?.message ??
                        state.errors.hipCm?.message}
                    </p>
                  )}
                </div>
              ))}
    </>
  )
}
