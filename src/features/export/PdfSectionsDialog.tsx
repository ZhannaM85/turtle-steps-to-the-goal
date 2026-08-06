import { useState } from 'react'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import type {
  CustomMetricPdfOption,
  PdfSectionAvailability,
  PdfSections,
} from './exportPdf'

export interface PdfSectionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (sections: PdfSections) => void
  submitting: boolean
  /** #630 — whether each built-in section has data in the currently-picked
   * date range; a section with none renders disabled rather than hidden,
   * so the user can see what's available once they log it. */
  availability: PdfSectionAvailability
  /** #630 — every defined custom metric, each flagged the same way. */
  customMetrics: CustomMetricPdfOption[]
}

const BUILTIN_SECTION_KEYS: (keyof PdfSectionAvailability)[] = [
  'weightTrend',
  'weeklyAverages',
  'bodyMeasurements',
  'bodyComposition',
  'sleep',
  'steps',
  'water',
  'cycle',
  'digestion',
  'alcohol',
  'nightEating',
]

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
  customMetrics,
}: PdfSectionsDialogProps) {
  const t = useTranslation()
  const [selected, setSelected] = useState<string[]>([])

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
        ...BUILTIN_SECTION_KEYS.filter((key) => availability[key]),
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
            <ToggleGroupItem
              value="weightTrend"
              className="h-12"
              disabled={!availability.weightTrend}
            >
              {t.export.pdfSectionWeightTrendLabel}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="weeklyAverages"
              className="h-12"
              disabled={!availability.weeklyAverages}
            >
              {t.export.pdfSectionWeeklyAveragesLabel}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="bodyMeasurements"
              className="h-12"
              disabled={!availability.bodyMeasurements}
            >
              {t.export.pdfSectionBodyMeasurementsLabel}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="bodyComposition"
              className="h-12"
              disabled={!availability.bodyComposition}
            >
              {t.dailyEntry.bodyCompositionLabel}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="sleep"
              className="h-12"
              disabled={!availability.sleep}
            >
              {t.dailyEntry.sleepLabel}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="steps"
              className="h-12"
              disabled={!availability.steps}
            >
              {t.dailyEntry.stepsLabel}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="water"
              className="h-12"
              disabled={!availability.water}
            >
              {t.dailyEntry.waterLabel}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="cycle"
              className="h-12"
              disabled={!availability.cycle}
            >
              {t.dailyEntry.onPeriodLabel}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="digestion"
              className="h-12"
              disabled={!availability.digestion}
            >
              {t.dailyEntry.hadConstipationLabel}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="alcohol"
              className="h-12"
              disabled={!availability.alcohol}
            >
              {t.dailyEntry.hadAlcoholLabel}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="nightEating"
              className="h-12"
              disabled={!availability.nightEating}
            >
              {t.dailyEntry.nightEatingLabel()}
            </ToggleGroupItem>
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
                  <ToggleGroupItem
                    key={metric.id}
                    value={`${CUSTOM_METRIC_PREFIX}${metric.id}`}
                    className="h-12"
                    disabled={!metric.available}
                  >
                    {metric.name}
                  </ToggleGroupItem>
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
