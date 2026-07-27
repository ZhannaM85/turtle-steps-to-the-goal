import { useEffect, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CustomMetric } from '@/domain/customMetric'
import { useTranslation } from '@/i18n'
import { metricRefLabel } from '@/shared/lib/metricRefLabel'
import {
  useCustomCorrelationStore,
  useCustomMetricStore,
} from '@/stores'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { PageHeader } from '@/shared/ui/page-header'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { AddCorrelationDialog } from './AddCorrelationDialog'
import { AddMetricDialog } from './AddMetricDialog'

function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function shiftDate(date: string, days: number): string {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd')
}

const inputKindLabelKey = {
  number: 'metricInputKindNumberOption',
  boolean: 'metricInputKindBooleanOption',
  scale5: 'metricInputKindScaleOption',
} as const

/** One metric's value-entry row for the currently-selected date (#336) —
 * widget shape depends on `metric.inputKind`: a plain number field, a
 * Yes/No toggle (stored as 1/0), or a 1-5 scale picker. All three commit
 * straight to `useCustomMetricStore.setEntryValue` — a `number` field
 * commits on blur/Enter (typing needs a chance to finish), the toggle/
 * scale widgets commit immediately on tap, same as this app's other
 * single-tap pickers (mood, reaction). */
function MetricValueRow({
  metric,
  date,
  value,
}: {
  metric: CustomMetric
  date: string
  value: number | undefined
}) {
  const t = useTranslation()
  const setEntryValue = useCustomMetricStore((state) => state.setEntryValue)
  // Lazy initializer, not a synced useEffect (the React Compiler's
  // react-hooks/set-state-in-effect lint rule flags calling setState
  // directly in an effect body, same rule `MealEditScreen.tsx`'s own doc
  // comment already ran into) — the parent keys each row by
  // `${metric.id}:${date}`, so a date change remounts this component
  // fresh instead of needing an effect to reset `draft` on prop change.
  const [draft, setDraft] = useState(value === undefined ? '' : String(value))

  function commitNumber() {
    const parsed = Number(draft)
    if (draft.trim() === '' || Number.isNaN(parsed)) return
    setEntryValue(metric.id, date, parsed)
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
      <span className="text-sm font-medium">
        {metric.name}
        {metric.unit && (
          <span className="text-muted-foreground"> ({metric.unit})</span>
        )}
      </span>
      {metric.inputKind === 'number' && (
        <Input
          type="text"
          inputMode="decimal"
          aria-label={metric.name}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitNumber}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitNumber()
            }
          }}
          className="h-9 w-24 text-right"
        />
      )}
      {metric.inputKind === 'boolean' && (
        <ToggleGroup
          type="single"
          aria-label={metric.name}
          value={value === undefined ? undefined : value === 1 ? 'yes' : 'no'}
          onValueChange={(next) => {
            if (next) setEntryValue(metric.id, date, next === 'yes' ? 1 : 0)
          }}
        >
          <ToggleGroupItem value="no" className="text-sm">
            {t.customMetrics.booleanNoOption}
          </ToggleGroupItem>
          <ToggleGroupItem value="yes" className="text-sm">
            {t.customMetrics.booleanYesOption}
          </ToggleGroupItem>
        </ToggleGroup>
      )}
      {metric.inputKind === 'scale5' && (
        <ToggleGroup
          type="single"
          aria-label={metric.name}
          value={value === undefined ? undefined : String(value)}
          onValueChange={(next) => {
            if (next) setEntryValue(metric.id, date, Number(next))
          }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <ToggleGroupItem
              key={n}
              value={String(n)}
              aria-label={t.customMetrics.scaleValueLabel(n)}
              className="w-9 text-sm"
            >
              {n}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
    </div>
  )
}

/**
 * Manage user-defined metrics and correlations (#336) — reached from
 * Settings, same "dedicated management screen" shape `RecipesSettingsScreen.tsx`
 * already established. Three sections: metric definitions, per-date value
 * entry (own date-nav header, mirroring `TodayScreen.tsx`'s own
 * prev/next-day arrows — a deliberate design-fork answer: entry lives on
 * its own screen, not folded into the daily log), and correlation
 * definitions (any two metrics, built-in or custom).
 */
export function CustomMetricsScreen() {
  const t = useTranslation()
  const metrics = useCustomMetricStore((state) => state.metrics)
  const entries = useCustomMetricStore((state) => state.entries)
  const loadMetrics = useCustomMetricStore((state) => state.loadAll)
  const addMetric = useCustomMetricStore((state) => state.addMetric)
  const deleteMetricAction = useCustomMetricStore((state) => state.deleteMetric)
  const correlations = useCustomCorrelationStore((state) => state.correlations)
  const loadCorrelations = useCustomCorrelationStore(
    (state) => state.loadCorrelations,
  )
  const addCorrelation = useCustomCorrelationStore(
    (state) => state.addCorrelation,
  )
  const deleteCorrelation = useCustomCorrelationStore(
    (state) => state.deleteCorrelation,
  )
  const deleteCorrelationsReferencingMetric = useCustomCorrelationStore(
    (state) => state.deleteCorrelationsReferencingMetric,
  )

  const [date, setDate] = useState(todayIso())
  const [isAddingMetric, setIsAddingMetric] = useState(false)
  const [isAddingCorrelation, setIsAddingCorrelation] = useState(false)

  useEffect(() => {
    loadMetrics()
    loadCorrelations()
  }, [loadMetrics, loadCorrelations])

  async function handleDeleteMetric(id: string) {
    await deleteCorrelationsReferencingMetric(id)
    await deleteMetricAction(id)
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/settings"
        className="self-start text-sm text-muted-foreground hover:text-foreground"
      >
        {t.customMetrics.backToSettingsLabel}
      </Link>
      <PageHeader
        title={t.customMetrics.screenTitle}
        description={t.customMetrics.screenDescription}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-foreground">
          {t.customMetrics.metricsSectionLabel}
        </h2>
        {metrics.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.customMetrics.emptyMetricsText}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {metrics.map((metric) => (
              <li
                key={metric.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{metric.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.customMetrics[inputKindLabelKey[metric.inputKind]]}
                    {metric.unit && ` · ${metric.unit}`}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.customMetrics.deleteMetricLabel(metric.name)}
                  onClick={() => handleDeleteMetric(metric.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setIsAddingMetric(true)}
        >
          {t.customMetrics.addMetricButton}
        </Button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-foreground">
          {t.customMetrics.logValuesSectionLabel}
        </h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="custom-metric-log-date">{t.customMetrics.dateLabel}</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-xl"
              aria-label={t.customMetrics.previousDayLabel}
              onClick={() => setDate((prev) => shiftDate(prev, -1))}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Input
              id="custom-metric-log-date"
              type="date"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 max-w-48"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-xl"
              aria-label={t.customMetrics.nextDayLabel}
              disabled={date >= todayIso()}
              onClick={() => setDate((prev) => shiftDate(prev, 1))}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
        {metrics.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.customMetrics.noMetricsToLogText}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {metrics.map((metric) => (
              <MetricValueRow
                key={`${metric.id}:${date}`}
                metric={metric}
                date={date}
                value={
                  entries.find(
                    (e) => e.metricId === metric.id && e.date === date,
                  )?.value
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-foreground">
          {t.customMetrics.correlationsSectionLabel}
        </h2>
        {correlations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.customMetrics.emptyCorrelationsText}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {correlations.map((correlation) => {
              const aLabel = metricRefLabel(t, correlation.metricA, metrics)
              const bLabel = metricRefLabel(t, correlation.metricB, metrics)
              const displayName = correlation.name || `${aLabel} vs. ${bLabel}`
              return (
                <li
                  key={correlation.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{displayName}</span>
                    <span className="text-xs text-muted-foreground">
                      {aLabel} · {bLabel}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.customMetrics.deleteCorrelationLabel(
                      displayName,
                    )}
                    onClick={() => deleteCorrelation(correlation.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setIsAddingCorrelation(true)}
        >
          {t.customMetrics.addCorrelationButton}
        </Button>
      </section>

      {isAddingMetric && (
        <AddMetricDialog
          open
          onOpenChange={setIsAddingMetric}
          onSave={(name, inputKind, unit) => addMetric(name, inputKind, unit)}
        />
      )}
      {isAddingCorrelation && (
        <AddCorrelationDialog
          open
          onOpenChange={setIsAddingCorrelation}
          metrics={metrics}
          onSave={(name, metricA, metricB) =>
            addCorrelation(name, metricA, metricB)
          }
        />
      )}
    </div>
  )
}
