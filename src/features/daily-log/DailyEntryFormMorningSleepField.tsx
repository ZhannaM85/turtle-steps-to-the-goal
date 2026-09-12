import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { splitHoursMinutes } from '@/shared/lib/sleepDuration'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  EntryFieldComparisonInfo,
  EntryFieldComparisonLive,
} from './EntryFieldComparison'
import {
  DayFieldEditActions,
  DayFieldHeader,
  DayFieldViewActions,
} from './DayFieldHeader'
import { AutoSleepScreenshotFillControl } from './autoSleepScreenshot/AutoSleepScreenshotFillControl'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

/** Sleep field extracted from DailyEntryFormMorning (#864). Markup unchanged. */
export function DailyEntryFormMorningSleepField() {
  const state = useDailyEntryFormStateContext()
  const { t } = state
  const comparison = state.entryComparisonBaselines
  const sleepHoursText = parseNumberInput(state.sleepHoursPart)
  const sleepMinutesText = parseNumberInput(state.sleepMinutesPart)
  const liveSleepHours =
    sleepHoursText === undefined && sleepMinutesText === undefined
      ? undefined
      : (sleepHoursText ?? 0) + (sleepMinutesText ?? 0) / 60

  return (
    <>
            {state.trackedFields.sleep &&
              (state.isConfirmingDeleteSleep ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.dailyEntry.sleepLabel}
                  </span>
                  <div className="flex min-h-12 items-center gap-2 rounded-lg bg-muted px-3 py-2">
                    <span className="text-sm text-muted-foreground">
                      {t.history.confirmDeleteLabel}
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={state.confirmDeleteSleep}
                    >
                      {t.history.confirmDeleteYes}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={state.cancelDeleteSleep}
                    >
                      {t.history.confirmDeleteNo}
                    </Button>
                  </div>
                </div>
              ) : state.showSleepAsDisplay ? (
                <div className="flex flex-col gap-1.5">
                  {/* #752 / #858 — screenshot + pencil + trash on the
                   * title row so the duration card is text only. */}
                  <DayFieldHeader
                    label={
                      <>
                        {t.dailyEntry.sleepLabel}
                        <EntryFieldComparisonInfo
                          field="sleepHours"
                          currentValue={state.sleepHours}
                          prior={comparison.prior('sleepHours')}
                          day30Value={comparison.day30Value('sleepHours')}
                          unit="hours"
                        />
                      </>
                    }
                    actions={
                      <>
                        <AutoSleepScreenshotFillControl
                          asOfDate={state.date}
                          onConfirm={state.applySleepPatch}
                        />
                        <DayFieldViewActions
                          editLabel={t.dailyEntry.editSleepLabel}
                          onEdit={() => {
                            const parts = splitHoursMinutes(state.sleepHours)
                            const deepParts = splitHoursMinutes(
                              state.deepSleepHours,
                            )
                            state.setSleepHoursPart(parts.hours)
                            state.setSleepMinutesPart(parts.minutes)
                            state.setDeepSleepHoursPart(deepParts.hours)
                            state.setDeepSleepMinutesPart(deepParts.minutes)
                            state.setIsEditingSleep(true)
                          }}
                          deleteLabel={t.dailyEntry.deleteSleepLabel}
                          onDelete={state.requestDeleteSleep}
                          showDelete={state.canDeleteSleep}
                        />
                      </>
                    }
                  />
                  <div className="flex h-12 items-center rounded-lg bg-muted px-3">
                    <span className="text-sm text-foreground">
                      {t.dailyEntry.sleepSummary(
                        state.sleepHours === undefined
                          ? '—'
                          : `${splitHoursMinutes(state.sleepHours).hours}${t.dailyEntry.hoursUnit} ${splitHoursMinutes(state.sleepHours).minutes}${t.dailyEntry.minutesUnit}`,
                        state.deepSleepHours === undefined
                          ? '—'
                          : `${splitHoursMinutes(state.deepSleepHours).hours}${t.dailyEntry.hoursUnit} ${splitHoursMinutes(state.deepSleepHours).minutes}${t.dailyEntry.minutesUnit}`,
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <DayFieldHeader
                    label={t.dailyEntry.sleepLabel}
                    actions={
                      <>
                        <AutoSleepScreenshotFillControl
                          asOfDate={state.date}
                          onConfirm={state.applySleepPatch}
                        />
                        <DayFieldEditActions
                          saveLabel={t.dailyEntry.saveSleepLabel}
                          onSave={state.saveSleep}
                          cancelLabel={t.dailyEntry.cancelEditSleepLabel}
                          onCancel={state.cancelEditSleep}
                          showCancel={state.canCancelSleepEdit}
                          deleteLabel={t.dailyEntry.deleteSleepLabel}
                          onDelete={state.requestDeleteSleep}
                          showDelete={state.canDeleteSleep}
                        />
                      </>
                    }
                  />
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="sleep-hours-part">
                        {t.dailyEntry.sleepHoursLabel}
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          id="sleep-hours-part"
                          type="text"
                          inputMode="numeric"
                          aria-label={`${t.dailyEntry.sleepHoursLabel} — ${t.dailyEntry.hoursFieldLabel}`}
                          aria-invalid={
                            state.errors.sleepHours ? true : undefined
                          }
                          className="h-12 w-12"
                          value={state.sleepHoursPart}
                          onChange={(e) =>
                            state.setSleepHoursPart(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveSleep()
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.hoursUnit}
                        </span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          aria-label={`${t.dailyEntry.sleepHoursLabel} — ${t.dailyEntry.minutesFieldLabel}`}
                          aria-invalid={
                            state.errors.sleepHours ? true : undefined
                          }
                          className="h-12 w-12"
                          value={state.sleepMinutesPart}
                          onChange={(e) =>
                            state.setSleepMinutesPart(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveSleep()
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.minutesUnit}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>{t.dailyEntry.deepSleepLabel}</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="numeric"
                          aria-label={`${t.dailyEntry.deepSleepLabel} — ${t.dailyEntry.hoursFieldLabel}`}
                          aria-invalid={
                            state.errors.deepSleepHours ? true : undefined
                          }
                          className="h-12 w-12"
                          value={state.deepSleepHoursPart}
                          onChange={(e) =>
                            state.setDeepSleepHoursPart(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveSleep()
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.hoursUnit}
                        </span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          aria-label={`${t.dailyEntry.deepSleepLabel} — ${t.dailyEntry.minutesFieldLabel}`}
                          aria-invalid={
                            state.errors.deepSleepHours ? true : undefined
                          }
                          className="h-12 w-12"
                          value={state.deepSleepMinutesPart}
                          onChange={(e) =>
                            state.setDeepSleepMinutesPart(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveSleep()
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.minutesUnit}
                        </span>
                      </div>
                    </div>
                  </div>
                  <EntryFieldComparisonLive
                    field="sleepHours"
                    currentValue={liveSleepHours}
                    prior={comparison.prior('sleepHours')}
                    unit="hours"
                  />
                  {(state.errors.sleepHours || state.errors.deepSleepHours) && (
                    <p className="text-sm text-destructive">
                      {state.errors.sleepHours?.message ??
                        state.errors.deepSleepHours?.message}
                    </p>
                  )}
                </div>
              ))}
    </>
  )
}
