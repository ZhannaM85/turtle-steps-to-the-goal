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
import { hadNightEating, type DailyEntry } from '@/domain/dailyEntry'
import {
  isGoalMetOnDate,
  isHeadingTowardGoalOnDate,
  type ReachedGoalWindow,
} from '@/domain/goal'
import { getDateFnsLocale, useLocale, useTranslation } from '@/i18n'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  useCalendarMarkerVisibilityStore,
  useCycleTrackingStore,
  useDigestionTrackingStore,
  type CalendarMarkerKey,
} from '@/stores'
import { DayDetail } from './DayDetail'

export interface CalendarViewProps {
  entries: DailyEntry[]
  /** #155: every reached goal window (past + active), for highlighting
   * which days were part of a successful week. */
  reachedWindows: ReachedGoalWindow[]
  /** #479 — when false, hide the strong met-day tint. */
  showMetDayTint?: boolean
  /** #479 — when false, hide the light heading-toward tint. */
  showHeadingTowardTint?: boolean
  /** Switches back to the list view, filtered + expanded to this day. */
  onEditDay: (date: string) => void
  /** Threaded down to DayDetail for the cycle-tracking toggle (#71). */
  onSaved: (entry: DailyEntry) => void
}

// Monday-start week, matching the app's existing ISO-week convention (the
// default weekStartsOn used by domain/stats/weeklySummaries.ts).
const WEEK_STARTS_ON = 1

export function CalendarView({
  entries,
  reachedWindows,
  showMetDayTint = true,
  showHeadingTowardTint = true,
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
  const markerVisible = useCalendarMarkerVisibilityStore(
    (state) => state.visible,
  )
  const toggleMarkerVisible = useCalendarMarkerVisibilityStore(
    (state) => state.toggleVisible,
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

  // #482 / #485 — which marker types actually paint (tracking gates ×
  // user visibility). Legend lists every trackable type (dimmed when
  // off) and is the primary toggle UI.
  const showEntry = markerVisible.entry
  const showPeriod = cycleTrackingEnabled && markerVisible.period
  const showDigestion = digestionTrackingEnabled && markerVisible.digestion
  const showNightEating = markerVisible.nightEating

  const legendItems: {
    key: CalendarMarkerKey
    swatchClass: string
    label: string
    pressed: boolean
  }[] = [
    {
      key: 'entry',
      swatchClass: 'bg-primary',
      label: t.history.calendarMarkerEntryLabel,
      pressed: markerVisible.entry,
    },
  ]
  if (cycleTrackingEnabled) {
    legendItems.push({
      key: 'period',
      swatchClass: 'bg-destructive',
      label: t.dailyEntry.onPeriodLabel,
      pressed: markerVisible.period,
    })
  }
  if (digestionTrackingEnabled) {
    legendItems.push({
      key: 'digestion',
      swatchClass: 'bg-amber-500',
      label: t.dailyEntry.hadConstipationLabel,
      pressed: markerVisible.digestion,
    })
  }
  legendItems.push({
    key: 'nightEating',
    swatchClass: 'bg-indigo-500',
    label: t.history.calendarMarkerNightEatingLabel,
    pressed: markerVisible.nightEating,
  })

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
          const hadConstipation = entry?.hadConstipation ?? false
          const nightEating = entry !== undefined && hadNightEating(entry)
          const inCurrentMonth = isSameMonth(day, currentMonth)
          const selected = selectedDate !== null && selectedDate === dateKey
          // #155 / #479: stronger tint for the met day; light tint only for
          // pre-met days whose weight dropped day-over-day (not whole-
          // window membership). Legend toggles can hide either.
          const isReachedDay =
            showMetDayTint && isGoalMetOnDate(dateKey, reachedWindows)
          const isHeadingToward =
            showHeadingTowardTint &&
            isHeadingTowardGoalOnDate(dateKey, reachedWindows, entries)
          const reachedGoalAriaSuffix = isReachedDay
            ? `, ${t.history.reachedGoalDayLabel}`
            : isHeadingToward
              ? `, ${t.history.reachedGoalWindowDayLabel}`
              : ''
          const anyMarkerSlot =
            showEntry || showPeriod || showDigestion || showNightEating
          return (
            <button
              key={dateKey}
              type="button"
              aria-label={`${format(day, 'PPPP', { locale: dateFnsLocale })}${reachedGoalAriaSuffix}`}
              aria-pressed={selected}
              aria-current={isToday(day) ? 'date' : undefined}
              onClick={() => selectDay(day)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-md py-1.5 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                inCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40',
                selected
                  ? 'bg-primary text-primary-foreground'
                  : isReachedDay
                    ? 'bg-primary/20 hover:bg-primary/30'
                    : isHeadingToward
                      ? 'bg-primary/10 hover:bg-primary/20'
                      : 'hover:bg-muted',
                !selected && isToday(day) && 'font-semibold text-primary',
              )}
            >
              {format(day, 'd')}
              {/* Dots sit side by side (#104). #482: only render a slot
               * when that marker type is visible — no transparent gap for
               * a toggled-off type (esp. night eating). */}
              {anyMarkerSlot && (
                <span className="flex flex-row items-center gap-0.5">
                  {showEntry && (
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
                  )}
                  {showPeriod && (
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
                  {showDigestion && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-1 rounded-full',
                        hadConstipation
                          ? selected
                            ? 'bg-primary-foreground'
                            : 'bg-amber-500'
                          : 'bg-transparent',
                      )}
                    />
                  )}
                  {showNightEating && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-1 rounded-full',
                        nightEating
                          ? selected
                            ? 'bg-primary-foreground'
                            : 'bg-indigo-500'
                          : 'bg-transparent',
                      )}
                    />
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* #482 / #485 — toggleable legend for every trackable marker type
       * (dimmed when off). Horizontal wrap at all breakpoints; Markers
       * popover removed — legend is the primary control. */}
      <ul
        aria-label={t.history.calendarMarkerLegendLabel}
        className="flex flex-row flex-wrap gap-x-3 gap-y-1.5 text-sm"
      >
        {legendItems.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              aria-pressed={item.pressed}
              aria-label={`${item.label} — ${t.history.calendarMarkerLegendLabel}`}
              onClick={() => toggleMarkerVisible(item.key)}
              className={cn(
                'flex items-center gap-2 rounded-md outline-none transition-opacity focus-visible:ring-3 focus-visible:ring-ring/50',
                item.pressed
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground/50 line-through',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  item.swatchClass,
                  !item.pressed && 'opacity-40',
                )}
              />
              {item.label}
            </button>
          </li>
        ))}
      </ul>

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
