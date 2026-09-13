import { useRef, useState } from 'react'
import {
  countUntimedSlotMeals,
  stampSlotDefaultsOnUntimedMeals,
} from '@/domain/dailyEntry'
import type { MealSlotKey } from '@/shared/lib/mealLabel'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb/dailyEntryRepository'
import { useTranslation } from '@/i18n'
import { useMealSlotDefaultTimesStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label } from '@/shared/ui/label'
import { TimeInput } from '@/shared/ui/time-input'
import { SettingsPinnableCard } from './SettingsPinnableCard'

export function SettingsMealSlotTimesSection() {
  const t = useTranslation()
  const mealSlotDefaultTimes = useMealSlotDefaultTimesStore(
    (state) => state.times,
  )
  const setMealSlotTime = useMealSlotDefaultTimesStore(
    (state) => state.setSlotTime,
  )
  const [slotApplyConfirmCount, setSlotApplyConfirmCount] = useState<
    number | null
  >(null)
  const [slotApplyDone, setSlotApplyDone] = useState<string | null>(null)
  const [slotApplyBusy, setSlotApplyBusy] = useState(false)
  const slotFocusValueRef = useRef<Partial<Record<MealSlotKey, string>>>({})

  async function offerApplySlotDefaults(previous: string, next: string) {
    if (previous === next) return
    const entries = await new IndexedDbDailyEntryRepository().getAll()
    const count = countUntimedSlotMeals(entries)
    if (count === 0) return
    setSlotApplyDone(null)
    setSlotApplyConfirmCount(count)
  }

  async function applySlotDefaultsToExisting() {
    setSlotApplyBusy(true)
    try {
      const repo = new IndexedDbDailyEntryRepository()
      const entries = await repo.getAll()
      const { entries: changed, mealCount } = stampSlotDefaultsOnUntimedMeals(
        entries,
        useMealSlotDefaultTimesStore.getState().times,
      )
      for (const entry of changed) {
        await repo.upsert(entry)
      }
      setSlotApplyConfirmCount(null)
      setSlotApplyDone(t.settings.mealSlotApplyDoneLabel(mealCount))
    } finally {
      setSlotApplyBusy(false)
    }
  }

  return (
    <SettingsPinnableCard pinId="mealSlotTimes">
      <CardHeader>
        <CardTitle>{t.settings.mealSlotDefaultTimesLabel}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <span className="text-sm text-muted-foreground">
          {t.settings.mealSlotDefaultTimesDescription}
        </span>
        <div className="flex flex-col gap-3">
          {(
            [
              ['breakfast', t.dailyEntry.defaultMealNamePresets[0]],
              ['lunch', t.dailyEntry.defaultMealNamePresets[1]],
              ['snack', t.dailyEntry.defaultMealNamePresets[3]],
              ['dinner', t.dailyEntry.defaultMealNamePresets[2]],
            ] as const
          ).map(([slot, label]) => (
            <div key={slot} className="flex flex-col gap-1.5">
              <Label htmlFor={`settings-meal-slot-${slot}`}>{label}</Label>
              <TimeInput
                id={`settings-meal-slot-${slot}`}
                aria-label={label}
                value={mealSlotDefaultTimes[slot]}
                onFocus={() => {
                  slotFocusValueRef.current[slot] = mealSlotDefaultTimes[slot]
                }}
                onChange={(e) => setMealSlotTime(slot, e.target.value)}
                onBlur={(e) => {
                  const previous = slotFocusValueRef.current[slot] ?? ''
                  void offerApplySlotDefaults(previous, e.target.value)
                }}
                className="w-32"
              />
            </div>
          ))}
        </div>
        {slotApplyConfirmCount !== null && (
          <div
            role="alertdialog"
            aria-label={t.settings.mealSlotApplyConfirmLabel(
              slotApplyConfirmCount,
            )}
            className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3"
          >
            <p className="text-sm text-foreground">
              {t.settings.mealSlotApplyConfirmLabel(slotApplyConfirmCount)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={slotApplyBusy}
                onClick={() => void applySlotDefaultsToExisting()}
              >
                {t.settings.mealSlotApplyConfirmYes}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={slotApplyBusy}
                onClick={() => setSlotApplyConfirmCount(null)}
              >
                {t.settings.mealSlotApplyConfirmNo}
              </Button>
            </div>
          </div>
        )}
        {slotApplyDone && (
          <p className="text-sm text-muted-foreground" role="status">
            {slotApplyDone}
          </p>
        )}
      </CardContent>
    </SettingsPinnableCard>
  )
}
