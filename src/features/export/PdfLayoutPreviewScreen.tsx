import { useEffect, useState } from 'react'
import { format, subDays } from 'date-fns'
import { Link, useSearchParams } from 'react-router-dom'
import { useLocale, useTranslation, getDictionary } from '@/i18n'
import { resolveWeekStartsOn } from '@/shared/lib/resolveWeekStartsOn'
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
import { buildPdfDocumentHtml } from './buildPdfDocumentHtml'
import { exportAllData } from './exportActions'
import {
  buildCustomMetricPdfSummaries,
  buildPdfSummaryData,
  type PdfSections,
} from './exportPdf'
import { filterByExportPeriod } from './filterByExportPeriod'

function defaultPeriodStart(): string {
  return format(subDays(new Date(), 89), 'yyyy-MM-dd')
}

function defaultPeriodEnd(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function resizePdfLayoutFrame(frame: HTMLIFrameElement): void {
  const root = frame.contentDocument?.documentElement
  if (!root) return
  frame.style.height = `${Math.max(root.scrollHeight, root.offsetHeight)}px`
}

/**
 * #933 — same HTML+CSS document as the PDF pipeline, shown in the browser
 * so layout can be inspected without html2canvas.
 */
export function PdfLayoutPreviewScreen() {
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
  const [searchParams] = useSearchParams()
  const periodStart = searchParams.get('start') || defaultPeriodStart()
  const periodEnd = searchParams.get('end') || defaultPeriodEnd()
  const [html, setHtml] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const bundle = await exportAllData()
        const earliestEntryDate = bundle.dailyEntries.reduce<
          string | undefined
        >(
          (min, entry) =>
            min === undefined || entry.date < min ? entry.date : min,
          undefined,
        )
        const data = buildPdfSummaryData(
          bundle.dailyEntries,
          periodStart,
          periodEnd,
          resolveWeekStartsOn(weekStart, earliestEntryDate),
        )
        await useCustomMetricStore.getState().loadAll()
        const { metrics, entries: customMetricEntries } =
          useCustomMetricStore.getState()
        const customMetricSummaries = buildCustomMetricPdfSummaries(
          metrics,
          customMetricEntries,
          periodStart,
          periodEnd,
        )
        const sections: PdfSections = {
          weightTrend: true,
          weeklyAverages: true,
          bodyMeasurements: true,
          bodyComposition: true,
          sleep: true,
          steps: true,
          water: true,
          cycle: true,
          digestion: true,
          alcohol: true,
          nightEating: true,
          customMetricIds: customMetricSummaries.map(
            (summary) => summary.metricId,
          ),
        }
        const dictionary = getDictionary(locale)
        const documentHtml = buildPdfDocumentHtml(
          data,
          dictionary,
          locale,
          unit,
          sections,
          customMetricSummaries,
          {
            entries: filterByExportPeriod(
              bundle.dailyEntries,
              periodStart,
              periodEnd,
            ),
            extras: {
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
            },
            sex,
          },
        )
        if (!cancelled) {
          setFailed(false)
          setHtml(documentHtml)
        }
      } catch {
        if (!cancelled) {
          setHtml(null)
          setFailed(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    alcoholTrackingEnabled,
    cycleTrackingEnabled,
    digestionTrackingEnabled,
    eatingReasonLabelOverrides,
    eatingReasonTrackingEnabled,
    locale,
    mealSlotDefaultTimes,
    micronutrients.magnesium,
    micronutrients.potassium,
    micronutrients.sodium,
    periodEnd,
    periodStart,
    sex,
    trackedFields.bodyComposition,
    trackedFields.bodyMeasurements,
    trackedFields.fiber,
    trackedFields.mood,
    trackedFields.morningNote,
    trackedFields.nightEating,
    trackedFields.note,
    trackedFields.sleep,
    trackedFields.steps,
    unit,
    waterTrackingEnabled,
    weekStart,
  ])

  return (
    <div className="min-h-svh bg-stone-200">
      <header className="sticky top-0 z-10 border-b border-border bg-background px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
        <Link
          to="/settings"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t.settings.backToSettingsLabel}
        </Link>
        <h1 className="mt-2 text-lg font-semibold">{t.export.pdfLayoutPreviewTitle}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {t.export.pdfLayoutPreviewBlurb}
        </p>
      </header>
      <div className="overflow-x-auto px-4 py-6">
        {failed && (
          <p className="text-sm text-destructive">{t.export.pdfLayoutPreviewFailed}</p>
        )}
        {!html && !failed && (
          <p className="text-sm text-muted-foreground">
            {t.export.pdfLayoutPreviewLoading}
          </p>
        )}
        {html && (
          <iframe
            title={t.export.pdfLayoutPreviewTitle}
            srcDoc={html}
            className="mx-auto block bg-white shadow-sm"
            style={{ width: '180mm', border: 0 }}
            onLoad={(event) => resizePdfLayoutFrame(event.currentTarget)}
          />
        )}
      </div>
    </div>
  )
}
