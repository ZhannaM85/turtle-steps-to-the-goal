import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { kgToLb } from '@/domain/goal'
import {
  suggestExemplaryDays,
  totalCalories,
  type DailyEntry,
} from '@/domain/dailyEntry'
import {
  formatNumber,
  formatSignedNumber,
  getDateFnsLocale,
  useLocale,
  useTranslation,
} from '@/i18n'
import { Button } from '@/shared/ui/button'
import { useExemplaryDayStore, useUnitStore } from '@/stores'

interface ExemplaryDayLinkProps {
  viewedDate: string
  entries: DailyEntry[]
  targetWeeklyLossKg?: number
  dailyCalorieTargetKcal?: number
}

/** #1125 — quiet link at the bottom of Day. Hidden while the setting is off. */
export function ExemplaryDayLink({
  viewedDate,
  entries,
  targetWeeklyLossKg,
  dailyCalorieTargetKcal,
}: ExemplaryDayLinkProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const unit = useUnitStore((state) => state.unit)
  const enabled = useExemplaryDayStore((state) => state.enabled)
  const pinnedDate = useExemplaryDayStore((state) => state.pinnedDate)
  const dismissedDates = useExemplaryDayStore((state) => state.dismissedDates)
  const setPinnedDate = useExemplaryDayStore((state) => state.setPinnedDate)
  const dismissDate = useExemplaryDayStore((state) => state.dismissDate)
  const [open, setOpen] = useState(false)

  const candidates = useMemo(
    () =>
      suggestExemplaryDays(
        entries.map((entry) => ({
          date: entry.date,
          weightKg: entry.weightKg,
          calories: totalCalories(entry.calorieEntries, entry.dayTotals),
          mealCount: entry.calorieEntries?.length ?? 0,
        })),
        { targetWeeklyLossKg, dailyCalorieTargetKcal, dismissedDates },
      ),
    [entries, targetWeeklyLossKg, dailyCalorieTargetKcal, dismissedDates],
  )

  if (!enabled) return null

  const linkDate = pinnedDate ?? candidates[0]?.date
  if (!linkDate || linkDate === viewedDate) return null

  const today = format(new Date(), 'yyyy-MM-dd')
  const href = linkDate === today ? '/' : `/?date=${linkDate}`
  const dateLabel = format(parseISO(linkDate), 'd MMM', { locale: dateFnsLocale })
  const linkText = pinnedDate
    ? t.dailyEntry.exemplaryDayPinnedLabel(dateLabel)
    : t.dailyEntry.exemplaryDaySuggestionLabel(dateLabel)
  const unitLabel = unit === 'lb' ? t.common.lb : t.common.kg

  function formatWeightChange(weightChangeKg: number): string {
    const display = unit === 'lb' ? kgToLb(weightChangeKg) : weightChangeKg
    return t.dailyEntry.exemplaryDayWeightChangeLabel(
      formatSignedNumber(display, locale),
      unitLabel,
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <Link
          to={href}
          className="text-sm text-foreground underline-offset-4 hover:underline"
        >
          {linkText}
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen((current) => !current)}
        >
          {t.dailyEntry.exemplaryDayChangeLabel}
        </Button>
      </div>
      {open && (
        <div className="flex flex-col gap-2">
          {candidates.length > 0 && (
            <ul className="flex flex-col gap-2">
              {candidates.map((candidate) => (
                <li
                  key={candidate.date}
                  className="flex flex-col gap-1 rounded-lg border px-3 py-2"
                >
                  <button
                    type="button"
                    className="text-left text-sm"
                    onClick={() => {
                      setPinnedDate(candidate.date)
                      setOpen(false)
                    }}
                  >
                    <span className="block font-medium">
                      {format(parseISO(candidate.date), 'd MMM', {
                        locale: dateFnsLocale,
                      })}
                    </span>
                    <span className="block text-muted-foreground">
                      {t.dailyEntry.exemplaryDayCaloriesLabel(
                        formatNumber(candidate.calories, locale, 0),
                      )}
                      {' · '}
                      {formatWeightChange(candidate.weightChangeKg)}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={() => dismissDate(candidate.date)}
                  >
                    {t.dailyEntry.exemplaryDayDismissLabel}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPinnedDate(viewedDate)
                setOpen(false)
              }}
            >
              {t.dailyEntry.exemplaryDayUseThisDayLabel}
            </Button>
            {pinnedDate !== null && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPinnedDate(null)
                  setOpen(false)
                }}
              >
                {t.dailyEntry.exemplaryDayChooseAutomaticallyLabel}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
