import { useState } from 'react'
import { useTranslation } from '@/i18n'
import {
  BUILTIN_MEAL_SLOT_DEFAULT_TIMES,
  type MealSlotDefaultTimes,
  type MealSlotKey,
} from '@/shared/lib/mealLabel'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

const SLOT_ORDER: MealSlotKey[] = ['breakfast', 'lunch', 'snack', 'dinner']

export interface MyFitnessPalSlotTimesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Prefill from remembered prefs (#588); falls back to #580 builtins. */
  initialTimes: MealSlotDefaultTimes
  onConfirm: (times: MealSlotDefaultTimes) => void
  /** When true, confirm continues to the password step instead of importing. */
  needsPasswordNext: boolean
  submitting: boolean
}

/** #588 — let the user set Breakfast/Lunch/Snack/Dinner default times before
 * a MyFitnessPal import stamps them onto meals that have no clock time. */
export function MyFitnessPalSlotTimesDialog({
  open,
  onOpenChange,
  initialTimes,
  onConfirm,
  needsPasswordNext,
  submitting,
}: MyFitnessPalSlotTimesDialogProps) {
  const t = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.myFitnessPalImport.closeDialogLabel}>
        <DialogTitle>{t.myFitnessPalImport.slotTimesDialogTitle}</DialogTitle>
        <DialogDescription>
          {t.myFitnessPalImport.slotTimesDialogDescription}
        </DialogDescription>
        {/* Remount when the dialog opens so fields pick up current prefs
         * without a setState-in-effect sync. */}
        {open ? (
          <SlotTimesFields
            initialTimes={initialTimes}
            onConfirm={onConfirm}
            needsPasswordNext={needsPasswordNext}
            submitting={submitting}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function SlotTimesFields({
  initialTimes,
  onConfirm,
  needsPasswordNext,
  submitting,
}: {
  initialTimes: MealSlotDefaultTimes
  onConfirm: (times: MealSlotDefaultTimes) => void
  needsPasswordNext: boolean
  submitting: boolean
}) {
  const t = useTranslation()
  const [times, setTimes] = useState<MealSlotDefaultTimes>(initialTimes)

  const slotLabels: Record<MealSlotKey, string> = {
    breakfast: t.dailyEntry.defaultMealNamePresets[0],
    lunch: t.dailyEntry.defaultMealNamePresets[1],
    dinner: t.dailyEntry.defaultMealNamePresets[2],
    snack: t.dailyEntry.defaultMealNamePresets[3],
  }

  function handleConfirm() {
    if (submitting) return
    const next: MealSlotDefaultTimes = { ...BUILTIN_MEAL_SLOT_DEFAULT_TIMES }
    for (const slot of SLOT_ORDER) {
      const value = times[slot]?.trim()
      next[slot] = value || BUILTIN_MEAL_SLOT_DEFAULT_TIMES[slot]
    }
    onConfirm(next)
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex flex-col gap-3">
        {SLOT_ORDER.map((slot) => (
          <div key={slot} className="flex flex-col gap-1.5">
            <Label htmlFor={`mfp-slot-time-${slot}`}>{slotLabels[slot]}</Label>
            <Input
              id={`mfp-slot-time-${slot}`}
              type="time"
              value={times[slot]}
              onChange={(e) =>
                setTimes((prev) => ({ ...prev, [slot]: e.target.value }))
              }
              disabled={submitting}
              className="h-12 w-32"
            />
          </div>
        ))}
      </div>
      <Button
        onClick={handleConfirm}
        disabled={submitting}
        className="self-start"
      >
        {needsPasswordNext
          ? t.myFitnessPalImport.slotTimesContinueButton
          : submitting
            ? t.myFitnessPalImport.importingButton
            : t.myFitnessPalImport.slotTimesImportButton}
      </Button>
    </div>
  )
}
