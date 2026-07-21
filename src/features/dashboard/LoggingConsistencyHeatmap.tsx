import { format, parseISO } from 'date-fns'
import type { CSSProperties } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import { loggingConsistencyWeeks, MAX_LOGGING_SIGNALS } from '@/domain/stats'
import { getDateFnsLocale, useLocale, useTranslation } from '@/i18n'
import { useWeekStartsOn } from '@/shared/hooks'

export interface LoggingConsistencyHeatmapProps {
  entries: DailyEntry[]
}

// Vertical list of week-rows (one per calendar week, most-recent-first,
// matching WeeklySummaryCards' own convention) rather than GitHub's
// horizontal year-view — a horizontally scrolling grid is awkward on a
// phone, whereas 7 columns × N rows fits a narrow screen naturally. Capped
// to a recent window rather than showing every week since the first-ever
// entry, which could otherwise grow unbounded for a long-time user.
const MAX_DISPLAYED_WEEKS = 12

function intensityStyle(intensity: number): CSSProperties {
  return {
    backgroundColor: intensity === 0 ? 'var(--muted)' : 'var(--chart-weight)',
    opacity: intensity === 0 ? 1 : intensity / MAX_LOGGING_SIGNALS,
  }
}

/**
 * GitHub-contribution-graph-style heatmap (#223) — one square per day,
 * shaded by how many of the app's core fields (weight/meals/sleep/steps)
 * were logged that day, not a chosen numeric metric (resolved as a genuine
 * scope fork via `AskUserQuestion`, since the issue itself flagged the
 * metric as undecided).
 */
export function LoggingConsistencyHeatmap({
  entries,
}: LoggingConsistencyHeatmapProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const weekStartsOn = useWeekStartsOn(entries)

  const weeks = loggingConsistencyWeeks(entries, weekStartsOn)
  if (weeks.length === 0) return null

  const recentWeeks = [...weeks].reverse().slice(0, MAX_DISPLAYED_WEEKS)
  const weekdayLabels = recentWeeks[0].days.map((day) =>
    format(parseISO(day.date), 'EEEEE', { locale: dateFnsLocale }),
  )

  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t.dashboard.loggingConsistencyTitle}
      </h2>
      <div className="flex flex-col gap-1">
        <div className="grid grid-cols-[3rem_repeat(7,1fr)] items-center gap-1">
          <span />
          {weekdayLabels.map((label, index) => (
            <span
              key={index}
              className="text-center text-[10px] text-muted-foreground"
            >
              {label}
            </span>
          ))}
        </div>
        {recentWeeks.map((week) => (
          <div
            key={week.weekStart}
            className="grid grid-cols-[3rem_repeat(7,1fr)] items-center gap-1"
          >
            <span className="text-[10px] whitespace-nowrap text-muted-foreground">
              {format(parseISO(week.weekStart), 'MMM d', {
                locale: dateFnsLocale,
              })}
            </span>
            {week.days.map((day) => (
              <div
                key={day.date}
                title={`${format(parseISO(day.date), 'PP', { locale: dateFnsLocale })}: ${day.intensity}/${MAX_LOGGING_SIGNALS}`}
                className="aspect-square rounded-sm"
                style={intensityStyle(day.intensity)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>{t.dashboard.heatmapLessLabel}</span>
        {Array.from({ length: MAX_LOGGING_SIGNALS + 1 }, (_, level) => (
          <div
            key={level}
            className="size-3 rounded-sm"
            style={intensityStyle(level)}
          />
        ))}
        <span>{t.dashboard.heatmapMoreLabel}</span>
      </div>
    </div>
  )
}
