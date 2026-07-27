import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { metricRefLabel } from '@/shared/lib/metricRefLabel'
import {
  useCustomCorrelationStore,
  useCustomMetricStore,
} from '@/stores'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { AddCorrelationDialog } from './AddCorrelationDialog'
import { AddMetricDialog } from './AddMetricDialog'

const inputKindLabelKey = {
  number: 'metricInputKindNumberOption',
  boolean: 'metricInputKindBooleanOption',
  scale5: 'metricInputKindScaleOption',
} as const

/**
 * Define/delete user-defined metrics and correlations (#336) — reached from
 * Settings, same "dedicated management screen" shape `RecipesSettingsScreen.tsx`
 * already established. **#362**: per-date value entry used to live here too
 * (own date-nav header) — moved to `CustomMetricLogSection.tsx`, mounted at
 * the bottom of `TodayScreen.tsx` instead, after live use showed an extra
 * screen to visit just to log today's values read as too easy to forget.
 * This screen now only has two sections: metric definitions and correlation
 * definitions (any two metrics, built-in or custom) — administrative tasks
 * that don't need to happen every day, unlike logging a value.
 */
export function CustomMetricsScreen() {
  const t = useTranslation()
  const metrics = useCustomMetricStore((state) => state.metrics)
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

      {metrics.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t.customMetrics.logValuesMovedText}
        </p>
      )}

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
