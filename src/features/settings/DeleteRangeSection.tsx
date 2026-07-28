import { useState } from 'react'
import { useTranslation } from '@/i18n'
import {
  IndexedDbCustomMetricEntryRepository,
  IndexedDbDailyEntryRepository,
} from '@/infrastructure/persistence/indexeddb'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()
const customMetricEntryRepository = new IndexedDbCustomMetricEntryRepository()

type Step =
  | { kind: 'idle' }
  | { kind: 'nothingToDelete' }
  | {
      kind: 'confirming'
      dailyEntryCount: number
      customMetricEntryCount: number
    }
  | { kind: 'deleting' }

/**
 * #377 — deletes `DailyEntry`/`CustomMetricEntry` rows within a chosen date
 * range, the same two date-scoped collections #370's ranged export
 * filters. Scope resolved via `AskUserQuestion`: the user chose "daily
 * entries + everything tied to those dates" over "just daily entries" —
 * `CustomMetricEntry` has its own `date` field, so it's the one other
 * collection that's genuinely tied to specific dates. Everything else
 * (goals, mealItems, foodOverrides, recipes, customMetrics,
 * customCorrelations) is definition/reference data, not scoped to a date,
 * same reasoning #370/#240 already established for what a date range does
 * and doesn't touch. Distinct from `ClearAllDataSection` (#164), which has
 * no range concept and wipes everything.
 */
export function DeleteRangeSection() {
  const t = useTranslation()
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [step, setStep] = useState<Step>({ kind: 'idle' })

  async function matchingRows() {
    const [dailyEntries, allCustomMetricEntries] = await Promise.all([
      dailyEntryRepository.getRange(start, end),
      customMetricEntryRepository.getAll(),
    ])
    const customMetricEntries = allCustomMetricEntries.filter(
      (entry) => entry.date >= start && entry.date <= end,
    )
    return { dailyEntries, customMetricEntries }
  }

  async function handleDeleteClick() {
    const { dailyEntries, customMetricEntries } = await matchingRows()
    if (dailyEntries.length === 0 && customMetricEntries.length === 0) {
      setStep({ kind: 'nothingToDelete' })
      return
    }
    setStep({
      kind: 'confirming',
      dailyEntryCount: dailyEntries.length,
      customMetricEntryCount: customMetricEntries.length,
    })
  }

  async function handleConfirm() {
    setStep({ kind: 'deleting' })
    const { dailyEntries, customMetricEntries } = await matchingRows()
    await Promise.all([
      ...dailyEntries.map((entry) => dailyEntryRepository.delete(entry.id)),
      ...customMetricEntries.map((entry) =>
        customMetricEntryRepository.delete(entry.id),
      ),
    ])
    // Same reasoning as ClearAllDataSection — several screens hold their
    // own already-loaded copies of now-deleted data in memory, a reload is
    // the simplest way to guarantee none of them show stale state.
    window.location.reload()
  }

  const isBusy = step.kind !== 'idle' && step.kind !== 'nothingToDelete'
  const canDelete = start !== '' && end !== '' && step.kind === 'idle'

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {t.settings.deleteRangeDescription}
      </p>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label={`${t.settings.deleteRangeLabel} — ${t.dashboard.rangeStartLabel}`}
          value={start}
          max={end || undefined}
          onChange={(e) => {
            setStart(e.target.value)
            setStep({ kind: 'idle' })
          }}
          className="h-10"
          disabled={isBusy}
        />
        <Input
          type="date"
          aria-label={`${t.settings.deleteRangeLabel} — ${t.dashboard.rangeEndLabel}`}
          value={end}
          min={start || undefined}
          onChange={(e) => {
            setEnd(e.target.value)
            setStep({ kind: 'idle' })
          }}
          className="h-10"
          disabled={isBusy}
        />
      </div>

      {step.kind === 'nothingToDelete' && (
        <p className="text-sm text-muted-foreground">
          {t.settings.deleteRangeNothingToDelete}
        </p>
      )}

      {step.kind === 'confirming' ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-destructive">
            {t.settings.deleteRangeConfirmPrompt(
              step.dailyEntryCount,
              step.customMetricEntryCount,
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirm}
            >
              {t.settings.deleteRangeConfirmYes}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep({ kind: 'idle' })}
            >
              {t.settings.deleteRangeConfirmNo}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="self-start"
          disabled={!canDelete}
          onClick={handleDeleteClick}
        >
          {step.kind === 'deleting'
            ? t.settings.deletingRangeButton
            : t.settings.deleteRangeButton}
        </Button>
      )}
    </div>
  )
}
