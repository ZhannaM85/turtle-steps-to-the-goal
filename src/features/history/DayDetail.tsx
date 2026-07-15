import { format, parseISO } from 'date-fns'
import {
  totalCalories,
  totalCarbs,
  totalFat,
  totalProtein,
  type DailyEntry,
} from '@/domain/dailyEntry'
import { kgToLb } from '@/domain/goal'
import {
  formatExactNumber,
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import { DAY_EMOTIONS, MEAL_EMOTIONS } from '@/shared/lib/emotionIcons'
import { macrosSummaryText } from '@/shared/lib/macroDisplay'
import { cn } from '@/shared/lib/utils'
import { useUnitStore } from '@/stores'

export interface DayDetailProps {
  entry: DailyEntry
  /**
   * Shows a date/weight/calories header above the note and meals — for
   * contexts where the entry isn't already summarized elsewhere (e.g. the
   * calendar view, #48). EntryRow's own expanded row skips this, since the
   * table row directly above it already shows date/weight/calories.
   */
  standalone?: boolean
  className?: string
}

/**
 * Read-only day summary: meals with their notes/emotions, the daily note,
 * and the day's overall mood (#44) — shared between EntryRow's expanded
 * row (#39) and the calendar view's day panel (#48) so there's only one
 * place that knows how to render a day's details.
 */
export function DayDetail({
  entry,
  standalone = false,
  className,
}: DayDetailProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const displayUnit = useUnitStore((state) => state.unit)

  const meals = entry.calorieEntries ?? []
  const DayEmotionIcon = DAY_EMOTIONS.find(
    (e) => e.value === entry.emotion,
  )?.Icon
  const hasNoteOrMood = Boolean(entry.note) || Boolean(DayEmotionIcon)
  const hasDetails = hasNoteOrMood || meals.length > 0

  const weightDisplay =
    entry.weightKg === undefined
      ? '—'
      : `${formatExactNumber(displayUnit === 'lb' ? kgToLb(entry.weightKg) : entry.weightKg, locale)} ${unitLabel(displayUnit, t)}`
  const calories = totalCalories(entry.calorieEntries)
  const caloriesDisplay =
    calories === undefined ? '—' : formatNumber(calories, locale, 0)
  // Only shown standalone (#52) — non-standalone (EntryRow's expanded
  // panel) already has the day's macro total in the table's Calories cell.
  const dayMacrosSummary = macrosSummaryText(
    totalProtein(entry.calorieEntries),
    totalFat(entry.calorieEntries),
    totalCarbs(entry.calorieEntries),
    locale,
    t,
  )

  return (
    <div className={cn('flex flex-col gap-2 text-sm', className)}>
      {standalone && (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">
            {format(parseISO(entry.date), 'PP', { locale: dateFnsLocale })}
          </span>
          <span className="text-muted-foreground">
            {weightDisplay} · {caloriesDisplay} {t.dailyEntry.kcalUnit}
          </span>
          {dayMacrosSummary && (
            <span className="text-xs text-muted-foreground">
              {dayMacrosSummary}
            </span>
          )}
        </div>
      )}

      {hasNoteOrMood && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {/* Note text duplicates the table's Note column on sm+ screens
           * (EntryRow use only) — the mood icon has no such column, so it
           * always stays visible regardless of screen size (#44). */}
          {entry.note && (
            <span className={standalone ? undefined : 'sm:hidden'}>
              {entry.note}
            </span>
          )}
          {DayEmotionIcon && (
            <>
              <DayEmotionIcon aria-hidden="true" className="size-3.5" />
              <span className="sr-only">
                {t.dailyEntry.emotionLabel(entry.emotion!)}
              </span>
            </>
          )}
        </div>
      )}

      {meals.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {meals.map((meal, index) => {
            const mealEmotionOption = MEAL_EMOTIONS.find(
              (e) => e.value === meal.emotion,
            )
            const mealMacrosSummary = macrosSummaryText(
              meal.proteinG,
              meal.fatG,
              meal.carbsG,
              locale,
              t,
            )
            return (
              <li key={meal.id} className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5">
                  {t.dailyEntry.mealLabel(index + 1)} —{' '}
                  {formatNumber(meal.amountKcal, locale, 0)}{' '}
                  {t.dailyEntry.kcalUnit}
                  {meal.timeEaten && (
                    <span className="text-muted-foreground">
                      · {meal.timeEaten}
                    </span>
                  )}
                  {mealEmotionOption && (
                    <>
                      {mealEmotionOption.Icon ? (
                        <mealEmotionOption.Icon
                          aria-hidden="true"
                          className="size-3.5 text-muted-foreground"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="text-sm leading-none"
                        >
                          {mealEmotionOption.emoji}
                        </span>
                      )}
                      <span className="sr-only">
                        {t.dailyEntry.mealEmotionLabel(meal.emotion!)}
                      </span>
                    </>
                  )}
                </span>
                {meal.note && (
                  <span className="text-xs text-muted-foreground">
                    {meal.note}
                  </span>
                )}
                {mealMacrosSummary && (
                  <span className="text-xs text-muted-foreground">
                    {mealMacrosSummary}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {!hasDetails && (
        <p className="text-muted-foreground">{t.history.noDetailsLabel}</p>
      )}
    </div>
  )
}
