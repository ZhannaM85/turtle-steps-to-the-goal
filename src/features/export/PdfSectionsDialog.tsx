import { useState } from 'react'
import { useTranslation, type Dictionary } from '@/i18n'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import {
  pdfSectionDisabledReason,
  type CustomMetricPdfOption,
  type PdfSectionAvailability,
  type PdfSectionTrackingGate,
  type PdfSections,
} from './exportPdf'

export interface PdfSectionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (sections: PdfSections) => void
  submitting: boolean
  /** #630 — whether each built-in section has data in the currently-picked
   * date range, ANDed with its Settings tracking gate (#633); a section
   * with either false renders disabled rather than hidden, so the user can
   * see what's available once they log it / turn tracking on. */
  availability: PdfSectionAvailability
  /** #634 — the pure has-data check alone (before the tracking AND), so a
   * disabled toggle's tooltip can tell "no data" apart from "not tracked". */
  rawAvailability: PdfSectionAvailability
  /** #634 — same Settings tracking gate `availability` was ANDed against,
   * needed here again to work out *which* of the two reasons applied. */
  trackingGate: PdfSectionTrackingGate
  /** #630 — every defined custom metric, each flagged the same way. */
  customMetrics: CustomMetricPdfOption[]
}

/** #634 — text for a disabled toggle's tooltip, naming which of the two
 * possible reasons applies (not tracked in Settings vs. no data logged in
 * the picked range) rather than leaving the user to guess. */
function disabledReasonText(
  t: Dictionary,
  reason: 'notTrackedInSettings' | 'noDataInRange',
): string {
  return reason === 'notTrackedInSettings'
    ? t.export.pdfSectionDisabledNotTrackedTooltip
    : t.export.pdfSectionDisabledNoDataTooltip
}

const CUSTOM_METRIC_PREFIX = 'custom:'

/**
 * #629 — lets the user pick which optional sections go into the PDF
 * summary (#609) before it's generated, instead of always bundling all of
 * them. Same multi-select `ToggleGroup` shape Settings' own "what to
 * track" groups already use, rather than introducing a new checkbox
 * primitive. The disclaimer footer isn't offered here — #609's own
 * acceptance criteria keep it unconditional.
 *
 * #630 expanded this from 3 fixed sections to every tracked metric
 * (built-in + custom): each toggle is disabled when `availability`/
 * `customMetrics` says the current date range has no data for it, rather
 * than being hidden — the acceptance criteria explicitly want "can see
 * what's available to include once they log it," not a shrinking list.
 * Two separate `ToggleGroup` roots (built-in vs. custom) share one
 * `selected` array — Radix only reports a root's own pressed values via
 * `onValueChange`, so each root's handler merges its own new values back
 * in alongside whatever the other root last reported, rather than
 * overwriting it.
 */
export function PdfSectionsDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
  availability,
  rawAvailability,
  trackingGate,
  customMetrics,
}: PdfSectionsDialogProps) {
  const t = useTranslation()
  const [selected, setSelected] = useState<string[]>([])

  // #634 — labels built from `t` so this can't drift from the JSX that used
  // to spell out one `ToggleGroupItem` per section; each disabled toggle
  // gets an `InfoTooltip` naming which of the two reasons applied.
  const builtinSections: {
    key: keyof PdfSectionAvailability
    label: string
  }[] = [
    { key: 'weightTrend', label: t.export.pdfSectionWeightTrendLabel },
    { key: 'weeklyAverages', label: t.export.pdfSectionWeeklyAveragesLabel },
    {
      key: 'bodyMeasurements',
      label: t.export.pdfSectionBodyMeasurementsLabel,
    },
    { key: 'bodyComposition', label: t.dailyEntry.bodyCompositionLabel },
    { key: 'sleep', label: t.dailyEntry.sleepLabel },
    { key: 'steps', label: t.dailyEntry.stepsLabel },
    { key: 'water', label: t.dailyEntry.waterLabel },
    { key: 'cycle', label: t.dailyEntry.onPeriodLabel },
    { key: 'digestion', label: t.dailyEntry.hadConstipationLabel },
    { key: 'alcohol', label: t.dailyEntry.hadAlcoholLabel },
    { key: 'nightEating', label: t.dailyEntry.nightEatingLabel() },
  ]

  // Defaults to every currently-available section selected, re-derived each
  // time the dialog transitions to open (the date range, and so
  // availability, may have changed since it was last open) — not on every
  // render, since that would silently reset a selection the user is
  // mid-edit on. Adjusted during render (same `prevX` pattern
  // `useChartGestureZoom.ts` already uses for this exact "reset on
  // transition" shape) rather than in a `useEffect`, which would call
  // `setSelected` a render late.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setSelected([
        ...builtinSections
          .map(({ key }) => key)
          .filter((key) => availability[key]),
        ...customMetrics
          .filter((metric) => metric.available)
          .map((metric) => `${CUSTOM_METRIC_PREFIX}${metric.id}`),
      ])
    }
  }

  function handleBuiltinValueChange(values: string[]) {
    setSelected((prev) => [
      ...prev.filter((value) => value.startsWith(CUSTOM_METRIC_PREFIX)),
      ...values,
    ])
  }

  function handleCustomValueChange(values: string[]) {
    setSelected((prev) => [
      ...prev.filter((value) => !value.startsWith(CUSTOM_METRIC_PREFIX)),
      ...values,
    ])
  }

  function handleSubmit() {
    const isSelected = (key: string) => selected.includes(key)
    onSubmit({
      weightTrend: isSelected('weightTrend'),
      weeklyAverages: isSelected('weeklyAverages'),
      bodyMeasurements: isSelected('bodyMeasurements'),
      bodyComposition: isSelected('bodyComposition'),
      sleep: isSelected('sleep'),
      steps: isSelected('steps'),
      water: isSelected('water'),
      cycle: isSelected('cycle'),
      digestion: isSelected('digestion'),
      alcohol: isSelected('alcohol'),
      nightEating: isSelected('nightEating'),
      customMetricIds: customMetrics
        .filter((metric) => isSelected(`${CUSTOM_METRIC_PREFIX}${metric.id}`))
        .map((metric) => metric.id),
    })
  }

  const builtinSelected = selected.filter(
    (value) => !value.startsWith(CUSTOM_METRIC_PREFIX),
  )
  const customSelected = selected.filter((value) =>
    value.startsWith(CUSTOM_METRIC_PREFIX),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.export.closePdfSectionsDialogLabel}>
        <DialogTitle>{t.export.pdfSectionsDialogTitle}</DialogTitle>
        <DialogDescription>
          {t.export.pdfSectionsDialogDescription}
        </DialogDescription>
        <div className="flex flex-col gap-4 pt-4">
          <ToggleGroup
            type="multiple"
            aria-label={t.export.pdfSectionsDialogTitle}
            value={builtinSelected}
            onValueChange={handleBuiltinValueChange}
            className="flex-wrap"
          >
            {builtinSections.map(({ key, label }) => {
              const disabled = !availability[key]
              const reason = disabled
                ? pdfSectionDisabledReason(key, rawAvailability, trackingGate)
                : null
              return (
                <span key={key} className="inline-flex items-center gap-1">
                  <ToggleGroupItem
                    value={key}
                    className="h-12"
                    disabled={disabled}
                  >
                    {label}
                  </ToggleGroupItem>
                  {reason && (
                    <InfoTooltip
                      text={disabledReasonText(t, reason)}
                      label={t.export.pdfSectionDisabledTooltipLabel}
                    />
                  )}
                </span>
              )
            })}
          </ToggleGroup>
          {customMetrics.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t.export.pdfSectionsCustomMetricsGroupLabel}
              </span>
              <ToggleGroup
                type="multiple"
                aria-label={t.export.pdfSectionsCustomMetricsGroupLabel}
                value={customSelected}
                onValueChange={handleCustomValueChange}
                className="flex-wrap"
              >
                {customMetrics.map((metric) => (
                  <span
                    key={metric.id}
                    className="inline-flex items-center gap-1"
                  >
                    <ToggleGroupItem
                      value={`${CUSTOM_METRIC_PREFIX}${metric.id}`}
                      className="h-12"
                      disabled={!metric.available}
                    >
                      {metric.name}
                    </ToggleGroupItem>
                    {/* #634 — custom metrics have no Settings tracking
                     * toggle of their own (unlike the built-in sections
                     * above), so a disabled one is always "no data". */}
                    {!metric.available && (
                      <InfoTooltip
                        text={t.export.pdfSectionDisabledNoDataTooltip}
                        label={t.export.pdfSectionDisabledTooltipLabel}
                      />
                    )}
                  </span>
                ))}
              </ToggleGroup>
            </div>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="self-start"
          >
            {submitting
              ? t.export.exportingPdfButton
              : t.export.pdfSectionsGenerateButton}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
