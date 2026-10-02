import { X } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { Chip } from '@/shared/ui/chip'
import { DialogClose, DialogTitle } from '@/shared/ui/dialog'
import { Label } from '@/shared/ui/label'
import { TimeInput } from '@/shared/ui/time-input'
import { MealTypePicker } from './MealTypePicker'

/**
 * #1077 — meal name and time share one row, each half of the why-eating
 * `grid-cols-2 gap-1.5` pair. `items-end` lines the time box up with the
 * name dropdown. `pr-4` matches the meal sheet's scroll gutter (#1072)
 * so each column is the same width as «Почему я сейчас ем?».
 */
const MEAL_CONTROL_ROW = 'grid grid-cols-2 items-end gap-1.5 pr-4'

export function AddMealDialogHeader({
  mealLabel,
  onMealLabelChange,
  timeEaten,
  onTimeEatenChange,
  mealLabelSuggestions,
  onSaveMealNameAsTemplate,
}: {
  mealLabel: string
  onMealLabelChange: (value: string) => void
  timeEaten: string
  onTimeEatenChange: (value: string) => void
  mealLabelSuggestions: string[]
  onSaveMealNameAsTemplate: (name: string) => void
}) {
  const t = useTranslation()
  return (
    <div
      data-testid="add-meal-header"
      className="flex shrink-0 flex-col gap-2 bg-card"
    >
      <div
        data-testid="add-meal-title-row"
        className="flex items-center justify-between gap-2"
      >
        <DialogTitle className="min-w-0">{t.dailyEntry.addMealDialogTitle}</DialogTitle>
        <DialogClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-touch"
            className="shrink-0"
            aria-label={t.dailyEntry.closeFoodDialogLabel}
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </DialogClose>
      </div>
      <div data-testid="add-meal-name-row" className={MEAL_CONTROL_ROW}>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="add-meal-name">{t.dailyEntry.mealLabelFieldLabel}</Label>
          <MealTypePicker
            id="add-meal-name"
            hideLabel
            className="min-w-0 w-full"
            value={mealLabel}
            options={mealLabelSuggestions}
            onChange={onMealLabelChange}
          />
        </div>
        <div className="flex h-12 min-w-0 items-center rounded-lg border border-input bg-transparent pr-1 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
          <TimeInput
            compact
            aria-label={t.dailyEntry.timeEatenLabel}
            value={timeEaten}
            onChange={(e) => onTimeEatenChange(e.target.value)}
            className="w-full min-w-0 border-transparent bg-transparent pr-0 focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
          />
          {timeEaten && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t.dailyEntry.clearTimeLabel}
              onClick={() => onTimeEatenChange('')}
            >
              <X aria-hidden="true" className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
      {mealLabel.trim() !== '' &&
        !mealLabelSuggestions.includes(mealLabel.trim()) && (
          <Chip onSelect={() => onSaveMealNameAsTemplate(mealLabel)}>
            {t.dailyEntry.saveMealNameAsTemplateLabel}
          </Chip>
        )}
    </div>
  )
}
