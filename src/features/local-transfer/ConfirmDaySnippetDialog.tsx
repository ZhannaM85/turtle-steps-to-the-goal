import { useEffect, useState } from 'react'
import type { Dictionary } from '@/i18n'
import { useTranslation } from '@/i18n'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { isLocalTransferEnabled } from '@/stores'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  applyDaySnippet,
  LocalTransferDisabledError,
  planDaySnippetApply,
  type DaySnippetApplyPlan,
  type DaySnippetScalarField,
} from './applyDaySnippet'
import type { DaySnippetPayload } from './daySnippetPayload'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

export interface ConfirmDaySnippetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payload: DaySnippetPayload | null
  onApplied?: () => void
}

export function ConfirmDaySnippetDialog({
  open,
  onOpenChange,
  payload,
  onApplied,
}: ConfirmDaySnippetDialogProps) {
  const t = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.today.importDayCancel}>
        <DialogTitle>{t.today.importDayTitle}</DialogTitle>
        <DialogDescription>
          {payload
            ? t.today.importDayDescription(payload.date)
            : t.today.importDayTitle}
        </DialogDescription>
        {open && payload ? (
          <ConfirmDaySnippetBody
            payload={payload}
            onOpenChange={onOpenChange}
            onApplied={onApplied}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function fieldLabel(t: Dictionary, field: DaySnippetScalarField): string {
  switch (field) {
    case 'weightKg':
      return t.dailyEntry.weightLabel
    case 'note':
      return t.dailyEntry.noteLabel
    case 'emotion':
      return t.dailyEntry.dayMoodLabel
    case 'sleepHours':
      return t.dailyEntry.sleepLabel
    case 'deepSleepHours':
      return t.dailyEntry.deepSleepLabel
    case 'steps':
      return t.dailyEntry.stepsLabel
    case 'onPeriod':
      return t.dailyEntry.onPeriodLabel
    case 'hadConstipation':
      return t.dailyEntry.hadConstipationLabel
    case 'hadAlcohol':
      return t.dailyEntry.hadAlcoholLabel
    case 'nightEatingOverride':
      return t.dailyEntry.nightEatingLabel()
    case 'dayTotals':
      return t.dailyEntry.dayTotalsLabel
    case 'waistCm':
      return t.dailyEntry.waistLabel
    case 'hipCm':
      return t.dailyEntry.hipLabel
    case 'bodyFatPercent':
      return t.dailyEntry.bodyFatLabel
    case 'muscleMassKg':
      return t.dailyEntry.muscleMassLabel
    case 'visceralFatRating':
      return t.dailyEntry.visceralFatLabel
    case 'bodyWaterPercent':
      return t.dailyEntry.bodyWaterLabel
    case 'boneMassKg':
      return t.dailyEntry.boneMassLabel
  }
}

function ConfirmDaySnippetBody({
  payload,
  onOpenChange,
  onApplied,
}: {
  payload: DaySnippetPayload
  onOpenChange: (open: boolean) => void
  onApplied?: () => void
}) {
  const t = useTranslation()
  const enabled = isLocalTransferEnabled()
  const [shownPlan, setShownPlan] = useState<DaySnippetApplyPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    void dailyEntryRepository.getByDate(payload.date).then((existing) => {
      if (!cancelled) setShownPlan(planDaySnippetApply(payload, existing))
    })
    return () => {
      cancelled = true
    }
  }, [payload])

  async function apply(overwrite: boolean) {
    if (!shownPlan) return
    setBusy(true)
    setError(null)
    try {
      await applyDaySnippet(payload, {
        overwriteFields: overwrite
          ? shownPlan.conflicts.map((conflict) => conflict.field)
          : [],
      })
      onApplied?.()
      onOpenChange(false)
    } catch (err) {
      if (err instanceof LocalTransferDisabledError) {
        setError(t.today.importDayDisabled)
      } else {
        setError(err instanceof Error ? err.message : t.today.importDayDisabled)
      }
    } finally {
      setBusy(false)
    }
  }

  if (!enabled) {
    return <p className="text-sm text-muted-foreground">{t.today.importDayDisabled}</p>
  }

  if (!shownPlan) {
    return <p className="text-sm text-muted-foreground">{t.common.loading}</p>
  }

  const hasFills =
    Object.keys(shownPlan.fills).length > 0 ||
    shownPlan.mealsToAppend.length > 0 ||
    shownPlan.waterToAppend.length > 0
  const hasWork = hasFills || shownPlan.conflicts.length > 0

  return (
    <div className="flex flex-col gap-3 pt-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!hasWork ? (
        <p className="text-sm text-muted-foreground">
          {t.today.importDayNothingToApply}
        </p>
      ) : (
        <>
          {Object.keys(shownPlan.fills).length > 0 ? (
            <p className="text-sm">
              {t.today.importDayFillCount(Object.keys(shownPlan.fills).length)}
            </p>
          ) : null}
          {shownPlan.mealsToAppend.length > 0 ||
          shownPlan.mealsSkippedDuplicates > 0 ? (
            <p className="text-sm">
              {t.today.importDayMealCount(
                shownPlan.mealsToAppend.length,
                shownPlan.mealsSkippedDuplicates,
              )}
            </p>
          ) : null}
          {shownPlan.waterToAppend.length > 0 ||
          shownPlan.waterSkippedDuplicates > 0 ? (
            <p className="text-sm">
              {t.today.importDayWaterCount(
                shownPlan.waterToAppend.length,
                shownPlan.waterSkippedDuplicates,
              )}
            </p>
          ) : null}
          {shownPlan.conflicts.length > 0 ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm">
                {t.today.importDayConflictCount(shownPlan.conflicts.length)}
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {shownPlan.conflicts.map((conflict) => (
                  <li key={conflict.field}>{fieldLabel(t, conflict.field)}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
      <div className="flex flex-col gap-2">
        {hasFills ? (
          <Button
            type="button"
            size="xl"
            className="w-full"
            disabled={busy}
            onClick={() => void apply(false)}
          >
            {t.today.importDayAddMissing}
          </Button>
        ) : null}
        {shownPlan.conflicts.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="xl"
            className="w-full"
            disabled={busy}
            onClick={() => void apply(true)}
          >
            {t.today.importDayAddAndReplace}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={busy}
          onClick={() => onOpenChange(false)}
        >
          {t.today.importDayCancel}
        </Button>
      </div>
    </div>
  )
}
