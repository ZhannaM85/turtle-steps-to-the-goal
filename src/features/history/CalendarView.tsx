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
import { Popover as PopoverPrimitive } from 'radix-ui'
import { hadNightEating, type DailyEntry } from '@/domain/dailyEntry'
import {
  isDateWithinReachedWindow,
  isGoalMetOnDate,
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

  // #482 — which marker types actually paint (tracking gates × user
  // visibility). Legend and popover checklist both read from this.
  const showEntry = markerVisible.entry
  const showPeriod = cycleTrackingEnabled && markerVisible.period
  const showDigestion = digestionTrackingEnabled && markerVisible.digestion
  const showNightEating = markerVisible.nightEating

  const legendItems: {
    key: CalendarMarkerKey
    swatchClass: string
    label: string
  }[] = []
  if (showEntry) {
    legendItems.push({
      key: 'entry',
      swatchClass: 'bg-primary',
      label: t.history.calendarMarkerEntryLabel,
    })
  }
  if (showPeriod) {
    legendItems.push({
      key: 'period',
      swatchClass: 'bg-destructive',
      label: t.dailyEntry.onPeriodLabel,
    })
  }
  if (showDigestion) {
    legendItems.push({
      key: 'digestion',
      swatchClass: 'bg-amber-500',
      label: t.dailyEntry.hadConstipationLabel,
    })
  }
  if (showNightEating) {
    legendItems.push({
      key: 'nightEating',
      swatchClass: 'bg-indigo-500',
      label: t.history.calendarMarkerNightEatingLabel,
    })
  }

  const checklistItems: {
    key: CalendarMarkerKey
    swatchClass: string
    label: string
    checked: boolean
  }[] = [
    {
      key: 'entry',
      swatchClass: 'bg-primary',
      label: t.history.calendarMarkerEntryLabel,
      checked: markerVisible.entry,
    },
  ]
  if (cycleTrackingEnabled) {
    checklistItems.push({
      key: 'period',
      swatchClass: 'bg-destructive',
      label: t.dailyEntry.onPeriodLabel,
      checked: markerVisible.period,
    })
  }
  if (digestionTrackingEnabled) {
    checklistItems.push({
      key: 'digestion',
      swatchClass: 'bg-amber-500',
      label: t.dailyEntry.hadConstipationLabel,
      checked: markerVisible.digestion,
    })
  }
  checklistItems.push({
    key: 'nightEating',
    swatchClass: 'bg-indigo-500',
    label: t.history.calendarMarkerNightEatingLabel,
    checked: markerVisible.nightEating,
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
        <div className="flex items-center gap-1">
          {/* #482 — toggle which marker dots paint; persisted separately
           * from Settings track toggles. */}
          <PopoverPrimitive.Root>
            <PopoverPrimitive.Trigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t.history.calendarMarkersDialogLabel}
              >
                {t.history.calendarMarkersButton}
              </Button>
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Portal>
              <PopoverPrimitive.Content
                side="bottom"
                align="end"
                sideOffset={6}
                className="z-50 flex w-56 flex-col gap-2 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-md outline-none"
              >
                <span className="text-sm font-medium">
                  {t.history.calendarMarkersDialogLabel}
                </span>
                <ul className="flex flex-col gap-2">
                  {checklistItems.map((item) => (
                    <li key={item.key}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleMarkerVisible(item.key)}
                          className="size-4 accent-primary"
                        />
                        <span
                          aria-hidden="true"
                          className={cn(
                            'size-2 shrink-0 rounded-full',
                            item.swatchClass,
                          )}
                        />
                        {item.label}
                      </label>
                    </li>
                  ))}
                </ul>
              </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
          </PopoverPrimitive.Root>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            {t.history.todayButton}
          </Button>
        </div>
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
          // #155: goal-reached day highlighting — a stronger tint for the
          // exact day a target was first met, a lighter one for the rest
          // of that window. Only applied when not selected; the selected
          // state's own bg-primary treatment already stands out.
          const isReachedDay = isGoalMetOnDate(dateKey, reachedWindows)
          const isReachedWindowDay =
            !isReachedDay && isDateWithinReachedWindow(dateKey, reachedWindows)
          const reachedGoalAriaSuffix = isReachedDay
            ? `, ${t.history.reachedGoalDayLabel}`
            : isReachedWindowDay
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
                    : isReachedWindowDay
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

      {/* #482 — legend for currently painted marker types. Shares the
       * page with #479's goal-tint legend above the calendar. */}
      {legendItems.length > 0 && (
        <ul
          aria-label={t.history.calendarMarkerLegendLabel}
          className="flex flex-col gap-1.5 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1.5"
        >
          {legendItems.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn('size-2 shrink-0 rounded-full', item.swatchClass)}
              />
              {item.label}
            </li>
          ))}
        </ul>
      )}

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
