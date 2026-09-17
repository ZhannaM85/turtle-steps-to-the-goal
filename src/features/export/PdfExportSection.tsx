import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format, subDays } from 'date-fns'
import { useLocale, useTranslation } from '@/i18n'
import {
  useAlcoholTrackingStore,
  useCustomMetricStore,
  useCycleTrackingStore,
  useDigestionTrackingStore,
  useEatingReasonTrackingStore,
  useMealSlotDefaultTimesStore,
  useMicronutrientTrackingStore,
  useProfileStore,
  useTrackedFieldsStore,
  useUnitStore,
  useWaterTrackingStore,
  useWeekStartStore,
} from '@/stores'
import { Button } from '@/shared/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { DateInput } from '@/shared/ui/date-input'
import { resolveWeekStartsOn } from '@/shared/lib/resolveWeekStartsOn'
import type { DailyEntry } from '@/domain/dailyEntry'
import { exportAllData } from './exportActions'
import type { DailyLogExportExtras } from './dailyLogExport'
import { filterByExportPeriod } from './filterByExportPeriod'
import {
  exportPeriodForPreset,
  exportPeriodFileStamp,
} from './exportPeriodFileStamp'
import {
  buildCustomMetricPdfSummaries,
  buildPdfSummaryData,
  buildSummaryPdf,
  customMetricPdfOptions,
  EMPTY_PDF_SECTION_AVAILABILITY,
  gatePdfSectionAvailability,
  pdfSectionAvailability,
  type CustomMetricPdfOption,
  type CustomMetricPdfSummary,
  type PdfSectionTrackingGate,
  type PdfSections,
  type PdfSummaryData,
} from './exportPdf'
import type { DailyLogPdfInput } from './exportPdfDailyLog'
import { PdfDebugToggle } from './PdfDebugToggle'
import { PdfSectionsDialog } from './PdfSectionsDialog'
import { sectionErrorMessage } from './exportSectionStatus'
import { SectionStatus } from './SectionStatus'
import { shareOrDownloadPdf } from './sharePdfFile'

type Status =
  | { kind: 'idle' }
  | { kind: 'exportingPdf' }
  | { kind: 'exportedPdf' }
  | { kind: 'error'; section: 'pdf'; message: string }

export function PdfExportSection() {
  const t = useTranslation()
  const locale = useLocale()
  const unit = useUnitStore((state) => state.unit)
  const weekStart = useWeekStartStore((state) => state.weekStart)
  const trackedFields = useTrackedFieldsStore((state) => state.tracked)
  const cycleTrackingEnabled = useCycleTrackingStore((state) => state.enabled)
  const digestionTrackingEnabled = useDigestionTrackingStore(
    (state) => state.enabled,
  )
  const alcoholTrackingEnabled = useAlcoholTrackingStore(
    (state) => state.enabled,
  )
  const waterTrackingEnabled = useWaterTrackingStore((state) => state.enabled)
  const sex = useProfileStore((state) => state.sex)
  const eatingReasonTrackingEnabled = useEatingReasonTrackingStore(
    (state) => state.enabled,
  )
  const eatingReasonLabelOverrides = useEatingReasonTrackingStore(
    (state) => state.builtinLabelOverrides,
  )
  const micronutrients = useMicronutrientTrackingStore((state) => state.tracked)
  const mealSlotDefaultTimes = useMealSlotDefaultTimesStore(
    (state) => state.times,
  )
  const pdfTrackingGate: PdfSectionTrackingGate = {
    sleep: trackedFields.sleep,
    steps: trackedFields.steps,
    bodyMeasurements: trackedFields.bodyMeasurements,
    bodyComposition: trackedFields.bodyComposition,
    nightEating: trackedFields.nightEating,
    cycle: cycleTrackingEnabled,
    digestion: digestionTrackingEnabled,
    alcohol: alcoholTrackingEnabled,
    water: waterTrackingEnabled,
  }
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  // #624 — a free-form date range (own state, not the shared periodStart/
  // periodEnd above) replaces the original fixed 30/90-day toggle. Unlike
  // that shared picker, blank isn't a valid "everything" default here — an
  // unbounded weight-trend chart/weekly table would defeat the "one-page
  // summary" point — so these start prefilled with the last 90 days
  // (matching the toggle's own prior default) rather than empty strings.
  // The two quick-fill buttons below just overwrite these same fields.
  const [pdfPeriodStart, setPdfPeriodStart] = useState(() =>
    format(subDays(new Date(), 89), 'yyyy-MM-dd'),
  )
  const [pdfPeriodEnd, setPdfPeriodEnd] = useState(() =>
    format(new Date(), 'yyyy-MM-dd'),
  )
  const [pdfRangePreset, setPdfRangePreset] = useState('month')
  function applyPdfRangePreset(value: string) {
    setPdfRangePreset(value)
    if (value === 'custom') return
    const bounds = exportPeriodForPreset(value as 'week' | 'month' | 'year' | 'all')
    setPdfPeriodStart(bounds.start)
    setPdfPeriodEnd(bounds.end)
  }
  const [pdfSectionsDialogOpen, setPdfSectionsDialogOpen] = useState(false)
  const [pdfPreviewData, setPdfPreviewData] = useState<PdfSummaryData | null>(
    null,
  )
  const [pdfCustomMetricSummaries, setPdfCustomMetricSummaries] = useState<
    CustomMetricPdfSummary[]
  >([])
  const [pdfCustomMetricOptions, setPdfCustomMetricOptions] = useState<
    CustomMetricPdfOption[]
  >([])
  const [pdfDailyEntries, setPdfDailyEntries] = useState<DailyEntry[]>([])
  const [pdfDailyLogExtras, setPdfDailyLogExtras] = useState<
    DailyLogExportExtras
  >({})

  async function openPdfSectionsDialog() {
    setStatus({ kind: 'exportingPdf' })
    try {
      const bundle = await exportAllData()
      const earliestEntryDate = bundle.dailyEntries.reduce<string | undefined>(
        (min, entry) =>
          min === undefined || entry.date < min ? entry.date : min,
        undefined,
      )
      const data = buildPdfSummaryData(
        bundle.dailyEntries,
        pdfPeriodStart,
        pdfPeriodEnd,
        resolveWeekStartsOn(weekStart, earliestEntryDate),
      )
      await useCustomMetricStore.getState().loadAll()
      const { metrics, entries: customMetricEntries } =
        useCustomMetricStore.getState()
      const customMetricSummaries = buildCustomMetricPdfSummaries(
        metrics,
        customMetricEntries,
        pdfPeriodStart,
        pdfPeriodEnd,
      )
      setPdfPreviewData(data)
      setPdfCustomMetricSummaries(customMetricSummaries)
      setPdfCustomMetricOptions(
        customMetricPdfOptions(metrics, customMetricSummaries),
      )
      setPdfDailyEntries(
        filterByExportPeriod(
          bundle.dailyEntries,
          pdfPeriodStart,
          pdfPeriodEnd,
        ),
      )
      setPdfDailyLogExtras({
        customMetrics: metrics,
        customMetricEntries,
        tracking: {
          sleep: trackedFields.sleep,
          steps: trackedFields.steps,
          bodyMeasurements: trackedFields.bodyMeasurements,
          note: trackedFields.note,
          morningNote: trackedFields.morningNote,
          mood: trackedFields.mood,
          bodyComposition: trackedFields.bodyComposition,
          nightEating: trackedFields.nightEating,
          fiber: trackedFields.fiber,
          cycle: cycleTrackingEnabled,
          digestion: digestionTrackingEnabled,
          alcohol: alcoholTrackingEnabled,
          water: waterTrackingEnabled,
          sodium: micronutrients.sodium,
          potassium: micronutrients.potassium,
          magnesium: micronutrients.magnesium,
          eatingReason: eatingReasonTrackingEnabled,
        },
        mealSlotTimes: mealSlotDefaultTimes,
        eatingReasonLabelOverrides,
      })
      setStatus({ kind: 'idle' })
      setPdfSectionsDialogOpen(true)
    } catch {
      setStatus({
        kind: 'error',
        section: 'pdf',
        message: t.export.exportPdfFailed,
      })
    }
  }

  async function handleExportPdf(
    sections: PdfSections,
    includeDailyLogPages: boolean,
  ) {
    if (!pdfPreviewData) return
    setStatus({ kind: 'exportingPdf' })
    try {
      const dailyLog: DailyLogPdfInput | undefined = includeDailyLogPages
        ? {
            entries: pdfDailyEntries,
            extras: pdfDailyLogExtras,
            sex,
          }
        : undefined
      const blob = await buildSummaryPdf(
        pdfPreviewData,
        t,
        locale,
        unit,
        sections,
        pdfCustomMetricSummaries,
        dailyLog,
      )
      const outcome = await shareOrDownloadPdf(
        blob,
        `turtle-steps-summary-${exportPeriodFileStamp(pdfPeriodStart, pdfPeriodEnd)}.pdf`,
      )
      if (outcome === 'cancelled') {
        setStatus({ kind: 'idle' })
        return
      }
      setPdfSectionsDialogOpen(false)
      setStatus({ kind: 'exportedPdf' })
    } catch {
      setStatus({
        kind: 'error',
        section: 'pdf',
        message: t.export.exportPdfFailed,
      })
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {t.export.exportPdfBlurb}
        </p>
        <div className="flex flex-col gap-2">
          <ToggleGroup
            type="single"
            aria-label={t.export.exportPdfRangeLabel}
            value={pdfRangePreset}
            onValueChange={(value) => value && applyPdfRangePreset(value)}
            className="flex-wrap justify-start"
          >
            <ToggleGroupItem value="week" className="h-12">{t.export.exportRangeWeek}</ToggleGroupItem>
            <ToggleGroupItem value="month" className="h-12">{t.export.exportRangeMonth}</ToggleGroupItem>
            <ToggleGroupItem value="year" className="h-12">{t.export.exportRangeYear}</ToggleGroupItem>
            <ToggleGroupItem value="all" className="h-12">{t.export.exportRangeAll}</ToggleGroupItem>
            <ToggleGroupItem value="custom" className="h-12">{t.export.exportRangeCustom}</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <span className="text-sm font-medium">
          {t.export.exportPdfRangeLabel}
        </span>
        <div className="flex items-center gap-2">
          <DateInput
            aria-label={`${t.export.exportPdfRangeLabel} — ${t.dashboard.rangeStartLabel}`}
            value={pdfPeriodStart}
            max={pdfPeriodEnd}
            onChange={(e) => setPdfPeriodStart(e.target.value)}
            className="h-12"
          />
          <DateInput
            aria-label={`${t.export.exportPdfRangeLabel} — ${t.dashboard.rangeEndLabel}`}
            value={pdfPeriodEnd}
            min={pdfPeriodStart}
            onChange={(e) => setPdfPeriodEnd(e.target.value)}
            className="h-12"
          />
        </div>
        <Button
          variant="outline"
          onClick={openPdfSectionsDialog}
          className="self-start"
          disabled={
            status.kind === 'exportingPdf' || !pdfPeriodStart || !pdfPeriodEnd
          }
        >
          {status.kind === 'exportingPdf'
            ? t.export.exportingPdfButton
            : t.export.exportPdfButton}
        </Button>
        <Button variant="outline" className="self-start" asChild>
          <Link
            to={`/settings/pdf-layout?start=${pdfPeriodStart}&end=${pdfPeriodEnd}`}
          >
            {t.export.pdfLayoutPreviewButton}
          </Link>
        </Button>
        <PdfDebugToggle />
        {status.kind === 'exportedPdf' && (
          <SectionStatus>{t.export.exportedPdfSummary}</SectionStatus>
        )}
        {sectionErrorMessage(status, 'pdf') && (
          <SectionStatus error>
            {sectionErrorMessage(status, 'pdf')!}
          </SectionStatus>
        )}
      </div>
      <PdfSectionsDialog
        open={pdfSectionsDialogOpen}
        onOpenChange={setPdfSectionsDialogOpen}
        onSubmit={handleExportPdf}
        submitting={status.kind === 'exportingPdf'}
        availability={
          pdfPreviewData
            ? gatePdfSectionAvailability(
                pdfSectionAvailability(pdfPreviewData),
                pdfTrackingGate,
              )
            : EMPTY_PDF_SECTION_AVAILABILITY
        }
        rawAvailability={
          pdfPreviewData
            ? pdfSectionAvailability(pdfPreviewData)
            : EMPTY_PDF_SECTION_AVAILABILITY
        }
        trackingGate={pdfTrackingGate}
        customMetrics={pdfCustomMetricOptions}
        dailyLogAvailable={pdfDailyEntries.length > 0}
      />
    </>
  )
}
