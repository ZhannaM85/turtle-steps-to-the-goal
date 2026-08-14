import { useState } from 'react'
import type { CustomMetric, MetricRef } from '@/domain/customMetric'
import { NUMERIC_SERIES_KEYS, type NumericSeriesKey } from '@/domain/stats'
import { useTranslation } from '@/i18n'
import { builtinMetricLabel, metricRefLabel } from '@/shared/lib/metricRefLabel'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select } from '@/shared/ui/select'

export interface AddCorrelationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metrics: CustomMetric[]
  onSave: (
    name: string | undefined,
    metricA: MetricRef,
    metricB: MetricRef,
  ) => void
}

/** Native `<select>` values are always strings — a `MetricRef` (a
 * discriminated union) round-trips through one via these two helpers
 * rather than pulling in a full combobox component just for this one
 * rarely-used picker. */
function encodeRef(ref: MetricRef): string {
  return ref.kind === 'builtin' ? `builtin:${ref.key}` : `custom:${ref.metricId}`
}

function decodeRef(value: string): MetricRef {
  if (value.startsWith('custom:')) {
    return { kind: 'custom', metricId: value.slice('custom:'.length) }
  }
  return { kind: 'builtin', key: value.slice('builtin:'.length) as NumericSeriesKey }
}

/**
 * Defines a new `CustomCorrelation` (#336) — picks any two metrics, built-
 * in or custom, to pair on the same day (see `CustomCorrelation`'s own doc
 * comment for why same-day, not this app's usual next-day-weight-delta
 * shape). Shared `Select` (#736) for each side — native chrome matching
 * `Input`, not a combobox.
 */
export function AddCorrelationDialog({
  open,
  onOpenChange,
  metrics,
  onSave,
}: AddCorrelationDialogProps) {
  const t = useTranslation()
  const [name, setName] = useState('')
  const [metricAValue, setMetricAValue] = useState(
    encodeRef({ kind: 'builtin', key: NUMERIC_SERIES_KEYS[0] }),
  )
  const [metricBValue, setMetricBValue] = useState(
    encodeRef({ kind: 'builtin', key: NUMERIC_SERIES_KEYS[1] }),
  )
  const sameMetric = metricAValue === metricBValue

  const options = [
    ...NUMERIC_SERIES_KEYS.map((key) => ({
      value: encodeRef({ kind: 'builtin', key }),
      label: builtinMetricLabel(t, key),
    })),
    ...metrics.map((metric) => ({
      value: encodeRef({ kind: 'custom', metricId: metric.id }),
      label: metricRefLabel(t, { kind: 'custom', metricId: metric.id }, metrics),
    })),
  ]

  function handleSave() {
    if (sameMetric) return
    onSave(name.trim() || undefined, decodeRef(metricAValue), decodeRef(metricBValue))
    setName('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.customMetrics.closeCorrelationDialogLabel}>
        <DialogTitle>{t.customMetrics.addCorrelationDialogTitle}</DialogTitle>
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custom-correlation-name">
              {t.customMetrics.correlationNameLabel}
            </Label>
            <Input
              id="custom-correlation-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.customMetrics.correlationNamePlaceholder}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custom-correlation-metric-a">
              {t.customMetrics.metricALabel}
            </Label>
            <Select
              id="custom-correlation-metric-a"
              value={metricAValue}
              onChange={(e) => setMetricAValue(e.target.value)}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custom-correlation-metric-b">
              {t.customMetrics.metricBLabel}
            </Label>
            <Select
              id="custom-correlation-metric-b"
              value={metricBValue}
              onChange={(e) => setMetricBValue(e.target.value)}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          {sameMetric && (
            <p className="text-sm text-destructive">
              {t.customMetrics.sameMetricErrorText}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t.customMetrics.cancelLabel}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={sameMetric}
              onClick={handleSave}
            >
              {t.customMetrics.saveButton}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
