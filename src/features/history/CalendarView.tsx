import { useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DailyEntry } from '@/domain/dailyEntry'
import { getDateFnsLocale, useLocale, useTranslation } from '@/i18n'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { useCycleTrackingStore, useDigestionTrackingStore } from '@/stores'
import { DayDetail } from './DayDetail'

export interface CalendarViewProps {
  entries: DailyEntry[]
  /** Switches back to the list view, filtered + expanded to this day. */
  onEditDay: (date: string) => void
  /** Threaded down to DayDetail for the cycle-tracking toggle (#71). */
  onSaved: (entry: DailyEntry) => void
}

// Monday-start week, matching the app's existing ISO-week convention
// (see domain/stats/currentWeekInfo.ts).
const WEEK_STARTS_ON = 1

export function CalendarView({
  entries,
  onEditDay,
  onSaved,
}: CalendarViewProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const cycleTrackingEnabled = useCycleTrackingStore((state) => state.enabled)
  const digestionTrackingEnabled = useDigestionTrackingStore(
    (state) => state.enabled,
  )
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const entriesByDate = new Map(entries.map((entry) => [entry.date, entry]))

  const gridStart = startOfWeek(startOfMonth(currentMonth), {
    weekStartsOn: WEEK_STARTS_ON,
  })
  const gridEnd = endOfWeek(endOfMonth(currentMonth), {
    weekStartsOn: WEEK_STARTS_ON,
  })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const weekdayLabels = days
    .slice(0, 7)
    .map((day) => format(day, 'EEEEEE', { locale: dateFnsLocale }))

  const selectedEntry = selectedDate
    ? (entriesByDate.get(selectedDate) ?? null)
    : null

  function selectDay(day: Date) {
    setSelectedDate(format(day, 'yyyy-MM-dd'))
    if (!isSameMonth(day, currentMonth)) setCurrentMonth(day)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.history.previousMonthLabel}
            onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.history.nextMonthLabel}
            onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <span className="text-sm font-medium capitalize">
          {format(currentMonth, 'LLLL yyyy', { locale: dateFnsLocale })}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(new Date())}
        >
          {t.history.todayButton}
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((label, index) => (
          <span
            key={index}
            className="pb-1 text-center text-xs font-medium text-muted-foreground uppercase"
          >
            {label}
          </span>
        ))}
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const entry = entriesByDate.get(dateKey)
          const hasEntry = entry !== undefined
          const onPeriod = entry?.onPeriod ?? false
          const hadBowelMovement = entry?.hadBowelMovement ?? false
          const inCurrentMonth = isSameMonth(day, currentMonth)
          const selected = selectedDate !== null && selectedDate === dateKey
          return (
            <button
              key={dateKey}
              type="button"
              aria-label={format(day, 'PPPP', { locale: dateFnsLocale })}
              aria-pressed={selected}
              aria-current={isToday(day) ? 'date' : undefined}
              onClick={() => selectDay(day)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-md py-1.5 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                inCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40',
                selected
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted',
                !selected && isToday(day) && 'font-semibold text-primary',
              )}
            >
              {format(day, 'd')}
              {/* Dots sit side by side (#104), not stacked — this row is a
               * flex-row sibling of the day number, not another flex-col
               * child, so a second dot doesn't push onto its own line. */}
              <span className="flex flex-row items-center gap-0.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-1 rounded-full',
                    hasEntry
                      ? selected
                        ? 'bg-primary-foreground'
                        : 'bg-primary'
                      : 'bg-transparent',
                  )}
                />
                {/* Second dot for period days (#72) — only rendered at all
                 * when cycle tracking is on, so the grid doesn't reserve
                 * extra space for a marker most users never see. */}
                {cycleTrackingEnabled && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-1 rounded-full',
                      onPeriod
                        ? selected
                          ? 'bg-primary-foreground'
                          : 'bg-destructive'
                        : 'bg-transparent',
                    )}
                  />
                )}
                {/* Third dot for bowel-movement days, mirroring the period
                 * dot's own gate/color pattern — a distinct color so the two
                 * opt-in trackers stay visually distinguishable side by
                 * side. */}
                {digestionTrackingEnabled && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-1 rounded-full',
                      hadBowelMovement
                        ? selected
                          ? 'bg-primary-foreground'
                          : 'bg-amber-500'
                        : 'bg-transparent',
                    )}
                  />
                )}
              </span>
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
          {selectedEntry ? (
            <>
              <DayDetail entry={selectedEntry} standalone onSaved={onSaved} />
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => onEditDay(selectedDate)}
              >
                {t.history.editThisDayLink}
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-foreground">
                {format(parseISO(selectedDate), 'PP', {
                  locale: dateFnsLocale,
                })}
              </span>
              <p className="text-sm text-muted-foreground">
                {t.history.emptyDayLabel}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
