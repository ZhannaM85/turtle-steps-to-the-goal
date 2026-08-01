import { useState, type ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyEntry } from '@/domain/dailyEntry'
import { kgToLb } from '@/domain/goal'
import {
  nightEatingCorrelationFromPoints,
  nightEatingPoints,
} from '@/domain/stats'
import {
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import {
  useDashboardChartVisibilityStore,
  useProfileStore,
  useUnitStore,
} from '@/stores'
import { useOutlierExclusion } from '@/shared/hooks'
import { Button } from '@/shared/ui/button'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { CorrelationChartTooltip } from './CorrelationChartTooltip'
import { CorrelationStrengthLabel } from './CorrelationStrengthLabel'
import { OutlierPointsList } from './OutlierPointsList'
import { renderOutlierScatterShape } from './outlierScatterShape'

export interface NightEatingCorrelationViewProps {
  entries: DailyEntry[]
  /** #355 — see `CorrelationViewProps.dragHandle`'s own doc comment. */
  dragHandle?: ReactNode
}

/** Fixed X positions for the two groups — not a real continuous scale, just
 * two side-by-side columns of points, "No"/"Yes" per `TICK_FORMATTER`
 * below. */
const NO_X = 0
const YES_X = 1

/**
 * `hadNightEating()` (#383) vs. next-day weight change — unlike every other
 * correlation view in this folder, the predictor here is already boolean
 * (see `nightEatingCorrelation.ts`'s own doc comment for why that means a
 * plain two-group comparison rather than a median split), so the scatter's
 * X axis is just two fixed columns ("No"/"Yes") rather than a continuous
 * scale. Distinct from `LateMealCorrelationView` (#116), which
 * median-splits the exact last-meal-time instead — kept as its own view
 * despite the conceptual overlap, confirmed with the user.
 */
export function NightEatingCorrelationView({
  entries,
  dragHandle,
}: NightEatingCorrelationViewProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const sex = useProfileStore((state) => state.sex)
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)
  const [isExpanded, setIsExpanded] = useState(false)
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.nightEatingCorrelation,
  )

  const rawPoints = nightEatingPoints(entries)
  const { flags, isExcluded, toggle, includedPoints } = useOutlierExclusion(
    'nightEating',
    rawPoints,
    (p) => (p.hadNightEating ? YES_X : NO_X),
    (p) => p.deltaKg,
    (p) => p.date,
  )

  if (rawPoints.length === 0) return null

  const points = rawPoints.map((point, i) => ({
    date: point.date,
    x: point.hadNightEating ? YES_X : NO_X,
    delta: toDisplay(point.deltaKg),
    isOutlier: flags[i],
    isExcluded: isExcluded(point),
  }))
  const outlierPoints = rawPoints.filter((_, i) => flags[i])

  const insight = nightEatingCorrelationFromPoints(includedPoints)
  const expanded = insight !== null || isExpanded

  const cardTitle = (
    <ChartTitleWithToggle
      chart="nightEatingCorrelation"
      title={t.dashboard.nightEatingCorrelationTitle}
      dragHandle={dragHandle}
      extraAction={
        insight === null && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            {isExpanded
              ? t.dashboard.correlationCollapseLabel
              : t.dashboard.correlationExpandLabel}
            {isExpanded ? (
              <ChevronUp aria-hidden="true" />
            ) : (
              <ChevronDown aria-hidden="true" />
            )}
          </Button>
        )
      }
    />
  )

  if (!cardVisible) {
    return <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">{cardTitle}</div>
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
      {cardTitle}
      {expanded && (
        <ResponsiveContainer width="100%" height={180}>
          <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              type="number"
              dataKey="x"
              name={t.dailyEntry.nightEatingLabel(sex)}
              domain={[-0.5, 1.5]}
              ticks={[NO_X, YES_X]}
              tickFormatter={(value: number) =>
                value === YES_X
                  ? t.dailyEntry.nightEatingYesOption
                  : t.dailyEntry.nightEatingNoOption
              }
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              type="number"
              dataKey="delta"
              name={t.dashboard.nextDayChangeLegend}
              width={40}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: 'var(--border)' }}
              wrapperStyle={{ pointerEvents: 'auto' }}
              content={
                <CorrelationChartTooltip
                  formatValue={(value, name) =>
                    name === t.dailyEntry.nightEatingLabel(sex)
                      ? value === YES_X
                        ? t.dailyEntry.nightEatingYesOption
                        : t.dailyEntry.nightEatingNoOption
                      : `${formatNumber(value, locale)} ${unit}`
                  }
                />
              }
            />
            <Scatter
              data={points}
              fill="var(--chart-weight)"
              isAnimationActive={false}
              shape={renderOutlierScatterShape('var(--chart-weight)')}
            />
          </ScatterChart>
        </ResponsiveContainer>
      )}
      {expanded && (
        <OutlierPointsList
          points={outlierPoints}
          isExcluded={isExcluded}
          onToggle={toggle}
          getKey={(point) => point.date}
          getDate={(point) => point.date}
          formatLabel={(point) =>
            format(parseISO(point.date), 'd MMM yyyy', {
              locale: dateFnsLocale,
            })
          }
        />
      )}
      {insight ? (
        <>
          <p className="text-sm text-foreground">
            {t.dashboard.nightEatingCorrelationSummary(
              insight.nightEatingAveragedMoreGain ? 'more' : 'less',
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t.dashboard.nightEatingCorrelationDayCount(insight.dayCount)}{' '}
            {t.dashboard.nightEatingCorrelationLagCaveat}
          </p>
          <CorrelationStrengthLabel strength={insight.strength} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t.dashboard.nightEatingCorrelationEmptyDescription}
        </p>
      )}
    </div>
  )
}
