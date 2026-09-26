import { RotateCcw, X } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { Chip } from '@/shared/ui/chip'
import { DialogTitle } from '@/shared/ui/dialog'
import { ControlWithInfo, InfoTooltip } from '@/shared/ui/info-tooltip'
import { Label } from '@/shared/ui/label'
import { TimeInput } from '@/shared/ui/time-input'
import { MealTypePicker } from './MealTypePicker'

export function AddMealDialogHeader({
  mealLabel,
  onMealLabelChange,
  timeEaten,
  onTimeEatenChange,
  mealLabelSuggestions,
  onSaveMealNameAsTemplate,
  repeatYesterdayLabel,
  onRepeatYesterday,
}: {
  mealLabel: string
  onMealLabelChange: (value: string) => void
  timeEaten: string
  onTimeEatenChange: (value: string) => void
  mealLabelSuggestions: string[]
  onSaveMealNameAsTemplate: (name: string) => void
  /** #1000 — set only when yesterday has foods to copy. No title tooltip.
   * #1003 — the same condition shows the info tip beside the arrow. */
  repeatYesterdayLabel?: string
  onRepeatYesterday?: () => void
}) {
  const t = useTranslation()
  return (
    <div
      data-testid="add-meal-header"
      className="flex shrink-0 flex-col gap-2 bg-card pr-10"
    >
      <Label htmlFor="add-meal-name">{t.dailyEntry.mealLabelFieldLabel}</Label>
      <div
        data-testid="add-meal-name-row"
        className="flex items-start justify-between gap-2"
      >
        <DialogTitle className="sr-only">{mealLabel}</DialogTitle>
        <MealTypePicker
          id="add-meal-name"
          hideLabel
          className="min-w-0 flex-1"
          value={mealLabel}
          options={mealLabelSuggestions}
          onChange={onMealLabelChange}
        />
        <div className="flex h-12 shrink-0 items-center rounded-lg border border-input bg-transparent pr-1 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
          <TimeInput
            compact
            aria-label={t.dailyEntry.timeEatenLabel}
            value={timeEaten}
            onChange={(e) => onTimeEatenChange(e.target.value)}
            className="border-transparent bg-transparent pr-0 focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
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
        {onRepeatYesterday && repeatYesterdayLabel && (
          <ControlWithInfo className="shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon-touch"
              className="shrink-0"
              aria-label={repeatYesterdayLabel}
              onClick={onRepeatYesterday}
            >
              <RotateCcw aria-hidden="true" />
            </Button>
            <InfoTooltip
              text={t.dailyEntry.repeatMealInfoText}
              label={t.dailyEntry.repeatMealInfoLabel}
            />
          </ControlWithInfo>
        )}
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
