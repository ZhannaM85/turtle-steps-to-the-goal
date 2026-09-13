import { useEffect, useRef, useState } from 'react'
import { format, subDays } from 'date-fns'
import { useLocale, useTranslation } from '@/i18n'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import {
  useAlcoholTrackingStore,
  useCustomMetricStore,
  useCycleTrackingStore,
  useDigestionTrackingStore,
  useFoodOverrideStore,
  useLastBackupStore,
  useMealItemStore,
  useMealSlotDefaultTimesStore,
  useMicronutrientTrackingStore,
  useProfileStore,
  useTrackedFieldsStore,
  useUnitStore,
  useWaterTrackingStore,
  useEatingReasonTrackingStore,
  useWeekStartStore,
} from '@/stores'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
import { daysSince } from '@/shared/lib/lastBackupReminder'
import { resolveWeekStartsOn } from '@/shared/lib/resolveWeekStartsOn'
import {
  decryptBackupJson,
  encryptBackupJson,
  isEncryptedBackupEnvelope,
  WrongBackupPasswordError,
  type EncryptedBackupEnvelope,
} from './encryptedBackup'
import { EncryptedBackupExportDialog } from './EncryptedBackupExportDialog'
import { EncryptedBackupImportDialog } from './EncryptedBackupImportDialog'
import {
  exportAllData,
  importAllData,
  InvalidBackupFileError,
  parseExportBundle,
} from './exportActions'
import { buildDailyLogCsv, CSV_BOM } from './exportCsv'
import {
  exportPeriodFileStamp,
  exportPeriodForPreset,
  resolveExportFileStem,
  type ExportRangePreset,
} from './exportPeriodFileStamp'
import { buildDailyLogMarkdown } from './exportMarkdown'
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
import { buildExportWorkbook } from './exportXlsx'
import {
  assertImportFileWithinSizeLimit,
  ImportFileTooLargeError,
} from './importFileSize'
import { PdfSectionsDialog } from './PdfSectionsDialog'
import { sectionErrorMessage } from './exportSectionStatus'
import { SectionStatus } from './SectionStatus'
import { ThirdPartyImportSection } from './ThirdPartyImportSection'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/** #240 — Excel/CSV/Markdown only, never the JSON backup (a backup should
 * stay complete). Blank start/end means "no lower/upper bound", so leaving
 * both blank exports everything, matching the pre-#240 behavior exactly. */
function filterByExportPeriod<T extends { date: string }>(
  entries: T[],
  start: string,
  end: string,
): T[] {
  if (!start && !end) return entries
  return entries.filter(
    (entry) => (!start || entry.date >= start) && (!end || entry.date <= end),
  )
}

type StatusSection =
  | 'jsonBackup'
  | 'rangedBackup'
  | 'encryptedBackup'
  | 'pdf'
  | 'excel'
  | 'csv'
  | 'markdown'
  | 'jsonImport'
  | 'encryptedImport'

type Status =
  | { kind: 'idle' }
  | { kind: 'exporting' }
  | { kind: 'exported'; goals: number; entries: number }
  | { kind: 'exportingRangedBackup' }
  | { kind: 'exportedRangedBackup'; goals: number; entries: number }
  | { kind: 'exportingEncrypted' }
  | { kind: 'exportedEncrypted' }
  | { kind: 'importingEncrypted' }
  | { kind: 'importedEncrypted'; goals: number; entries: number }
  | { kind: 'exportingPdf' }
  | { kind: 'exportedPdf' }
  | { kind: 'exportingExcel' }
  | { kind: 'exportedExcel'; goals: number; entries: number }
  | { kind: 'exportingCsv' }
  | { kind: 'exportedCsv'; entries: number }
  | { kind: 'exportingMarkdown' }
  | { kind: 'exportedMarkdown'; entries: number }
  | { kind: 'importing' }
  | { kind: 'imported'; goals: number; entries: number }
  /** #617 — `section` keeps the alert under the matching export/import block. */
  | { kind: 'error'; section: StatusSection; message: string }

/** "50 KB" / "1.2 MB" / "1.2 GB" — used for both usage and quota (#191:
 * quota is now shown alongside usage, so this needs a GB tier it never
 * used to reach). */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function ExportSection() {
  const t = useTranslation()
  // #414 — gender-correct nightEatingColumn header (#398/#407's own
  // pattern), same real profile sex every other consumer of that label
  // already reads.
  const sex = useProfileStore((state) => state.sex)
  const recordBackupExport = useLastBackupStore((state) => state.recordExport)
  const lastExportedAt = useLastBackupStore((state) => state.lastExportedAt)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  // #608 — optional password-encrypted JSON backup. Export: a dialog sets
  // a fresh password before encrypting. Import: `handleImportFile` shares
  // the *same* file input/picker as the plain JSON import above (it
  // detects the encrypted envelope shape after reading the file, before
  // deciding which path to take) — `pendingEncryptedEnvelope` holds the
  // parsed envelope while its own password dialog is open.
  const [isEncryptedExportDialogOpen, setIsEncryptedExportDialogOpen] =
    useState(false)
  const [pendingEncryptedEnvelope, setPendingEncryptedEnvelope] =
    useState<EncryptedBackupEnvelope | null>(null)
  const [encryptedImportError, setEncryptedImportError] = useState<
    string | null
  >(null)
  // #609 — PDF summary. `unit`/`weekStart` read the same live preferences
  // Dashboard/History already use, so the document matches what the user
  // sees in-app rather than a hardcoded kg/Monday-week default.
  const locale = useLocale()
  const unit = useUnitStore((state) => state.unit)
  const weekStart = useWeekStartStore((state) => state.weekStart)
  // #633 — gates the picker's availability below against what Settings'
  // "What to track" currently has on, not just whether a section has any
  // logged data ever (#630's own check, `pdfSectionAvailability`).
  const trackedFields = useTrackedFieldsStore((state) => state.tracked)
  const cycleTrackingEnabled = useCycleTrackingStore((state) => state.enabled)
  const digestionTrackingEnabled = useDigestionTrackingStore(
    (state) => state.enabled,
  )
  const alcoholTrackingEnabled = useAlcoholTrackingStore(
    (state) => state.enabled,
  )
  const waterTrackingEnabled = useWaterTrackingStore((state) => state.enabled)
  const eatingReasonTrackingEnabled = useEatingReasonTrackingStore(
    (state) => state.enabled,
  )
  const eatingReasonLabelOverrides = useEatingReasonTrackingStore(
    (state) => state.builtinLabelOverrides,
  )
  const micronutrients = useMicronutrientTrackingStore((state) => state.tracked)
  // #634 — built once so both `gatePdfSectionAvailability` and the
  // `PdfSectionsDialog`'s own disabled-reason tooltip (needs the raw gate,
  // not just the already-ANDed `availability`) read the same values.
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
  // #744 — analysis CSV/Excel/Markdown omit a column when its Settings
  // gate is off. JSON backup stays complete. Custom metrics have no
  // What-to-track toggle and always keep their columns.
  const analysisExportTracking = {
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
  }
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
  // #629 — which sections to include is picked in a dialog shown right
  // before generation, not baked into the period picker above. #630 — the
  // dialog needs to know which sections have data in the current range
  // before it opens, so `openPdfSectionsDialog` (below) computes `data`/
  // `customMetricSummaries` once and reuses them for both the dialog's
  // availability and the actual generation — no reason to hit IndexedDB
  // twice for the same, short-lived round trip.
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
  const mealSlotDefaultTimes = useMealSlotDefaultTimesStore(
    (state) => state.times,
  )
  const [storageUsage, setStorageUsage] = useState<number | null>(null)
  const [storageQuota, setStorageQuota] = useState<number | null>(null)
  // #240 — optional, applies to Excel/CSV/Markdown only (see
  // filterByExportPeriod's own note).
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [rangePreset, setRangePreset] = useState<ExportRangePreset>('all')
  const [fileStem, setFileStem] = useState(() =>
    `turtle-steps-daily-log-${exportPeriodFileStamp('', '')}`,
  )
  const earliestEntryDateRef = useRef<string | undefined>(undefined)
  const skipAllAutofillRef = useRef(false)

  function setPeriodRange(start: string, end: string, preset: ExportRangePreset) {
    if (preset !== 'all') skipAllAutofillRef.current = true
    setFileStem((prev) => {
      const oldDefault = `turtle-steps-daily-log-${exportPeriodFileStamp(periodStart, periodEnd)}`
      const nextDefault = `turtle-steps-daily-log-${exportPeriodFileStamp(start, end)}`
      return prev === oldDefault || !prev.trim() ? nextDefault : prev
    })
    setPeriodStart(start)
    setPeriodEnd(end)
    setRangePreset(preset)
  }

  function applyRangePreset(preset: ExportRangePreset) {
    if (preset === 'custom') {
      skipAllAutofillRef.current = true
      setRangePreset('custom')
      return
    }
    if (preset !== 'all') skipAllAutofillRef.current = true
    const bounds = exportPeriodForPreset(
      preset,
      new Date(),
      earliestEntryDateRef.current,
    )
    setPeriodRange(bounds.start, bounds.end, preset)
  }

  // #830 — All starts blank until we know the first logged day, then fills
  // first-day → today so the date fields and filename show the real span.
  useEffect(() => {
    let cancelled = false
    dailyEntryRepository.getEarliestEntryDate().then((earliest) => {
      if (cancelled) return
      earliestEntryDateRef.current = earliest
      if (skipAllAutofillRef.current) return
      const bounds = exportPeriodForPreset('all', new Date(), earliest)
      setFileStem((prev) => {
        const oldDefault = `turtle-steps-daily-log-${exportPeriodFileStamp('', '')}`
        const nextDefault = `turtle-steps-daily-log-${exportPeriodFileStamp(bounds.start, bounds.end)}`
        return prev === oldDefault || !prev.trim() ? nextDefault : prev
      })
      setPeriodStart(bounds.start)
      setPeriodEnd(bounds.end)
      setRangePreset('all')
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Best-effort (#176) — navigator.storage is unavailable in some browsers
  // and estimate() itself can reject; either way, just show nothing rather
  // than an error state for a purely informational number. #191: also
  // reads `quota` now (originally left out on the reasoning that it's
  // usually just a large browser-computed ceiling, not a small meaningful
  // number — but users asked directly "how much space is left" and
  // "is there even a limit," so showing the real number lets them judge
  // that for themselves instead of the app deciding it's not worth seeing).
  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((estimate) => {
        if (estimate.usage !== undefined) setStorageUsage(estimate.usage)
        if (estimate.quota !== undefined) setStorageQuota(estimate.quota)
      })
      .catch(() => {})
  }, [])

  async function handleExport() {
    setStatus({ kind: 'exporting' })
    try {
      const bundle = await exportAllData()
      const json = JSON.stringify(bundle, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `turtle-steps-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
      link.click()
      URL.revokeObjectURL(url)
      // #599 — only the complete backup resets the "last backup" reminder;
      // the ranged/Excel/CSV/Markdown exports further down are partial or
      // non-restorable, not a substitute for this one.
      recordBackupExport()
      setStatus({
        kind: 'exported',
        goals: bundle.goals.length,
        entries: bundle.dailyEntries.length,
      })
    } catch {
      setStatus({
        kind: 'error',
        section: 'jsonBackup',
        message: t.export.exportFailed,
      })
    }
  }

  // #608 — same complete bundle `handleExport` above downloads, wrapped
  // in AES-GCM encryption keyed from the password the dialog collected.
  // Deliberately doesn't call `recordBackupExport()` — the plain "last
  // backup" reminder (#599) is about *a* restorable backup existing at
  // all, and this one already satisfies that just by being a complete
  // export; recording it a second time would just double-count the same
  // moment, not track something new.
  async function handleExportEncrypted(password: string) {
    setStatus({ kind: 'exportingEncrypted' })
    try {
      const bundle = await exportAllData()
      const json = JSON.stringify(bundle)
      const envelope = await encryptBackupJson(json, password)
      const blob = new Blob([JSON.stringify(envelope)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `turtle-steps-backup-${format(new Date(), 'yyyy-MM-dd')}.encrypted.json`
      link.click()
      URL.revokeObjectURL(url)
      recordBackupExport()
      setIsEncryptedExportDialogOpen(false)
      setStatus({ kind: 'exportedEncrypted' })
    } catch {
      setStatus({
        kind: 'error',
        section: 'encryptedBackup',
        message: t.export.exportEncryptedFailed,
      })
    }
  }

  // #370 — reverses #240's original decision that the JSON backup should
  // always stay complete, resolved via AskUserQuestion: rather than making
  // the one "Export backup" button above range-aware (which would make a
  // partial file ambiguous as an actual restore source), this is a second,
  // clearly separate action. Filters dailyEntries/customMetricEntries (the
  // date-scoped collections) the same way filterByExportPeriod already
  // does for Excel/CSV/Markdown; goals and every definition/reference
  // collection (mealItems, foodOverrides, recipes, customMetrics,
  // customCorrelations) stay complete, same as those three exports.
  async function handleExportRangedBackup() {
    setStatus({ kind: 'exportingRangedBackup' })
    try {
      const bundle = await exportAllData()
      const dailyEntries = filterByExportPeriod(
        bundle.dailyEntries,
        periodStart,
        periodEnd,
      )
      const customMetricEntries = filterByExportPeriod(
        bundle.customMetricEntries ?? [],
        periodStart,
        periodEnd,
      )
      const rangedBundle = { ...bundle, dailyEntries, customMetricEntries }
      const json = JSON.stringify(rangedBundle, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${resolveExportFileStem(fileStem, periodStart, periodEnd)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setStatus({
        kind: 'exportedRangedBackup',
        goals: rangedBundle.goals.length,
        entries: dailyEntries.length,
      })
    } catch {
      setStatus({
        kind: 'error',
        section: 'rangedBackup',
        message: t.export.exportFailed,
      })
    }
  }

  // Distinct from handleExport (#123) — this is a human-readable view for
  // browsing/analysis, not a re-importable backup, so it's kept as a
  // separate action rather than a format option on the same button.
  async function handleExportExcel() {
    setStatus({ kind: 'exportingExcel' })
    try {
      const bundle = await exportAllData()
      const dailyEntries = filterByExportPeriod(
        bundle.dailyEntries,
        periodStart,
        periodEnd,
      )
      const workbook = await buildExportWorkbook(
        bundle.goals,
        dailyEntries,
        t,
        sex,
        {
          customMetrics: bundle.customMetrics,
          customMetricEntries: bundle.customMetricEntries,
          tracking: analysisExportTracking,
          mealSlotTimes: mealSlotDefaultTimes,
          eatingReasonLabelOverrides,
        },
      )
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${resolveExportFileStem(fileStem, periodStart, periodEnd)}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
      setStatus({
        kind: 'exportedExcel',
        goals: bundle.goals.length,
        entries: dailyEntries.length,
      })
    } catch {
      setStatus({
        kind: 'error',
        section: 'excel',
        message: t.export.exportExcelFailed,
      })
    }
  }

  // Distinct from both handleExport and handleExportExcel (#125) — a
  // single flat table, no goals data, meant for pasting into an LLM
  // conversation rather than viewing in a spreadsheet.
  async function handleExportCsv() {
    setStatus({ kind: 'exportingCsv' })
    try {
      const bundle = await exportAllData()
      const dailyEntries = filterByExportPeriod(
        bundle.dailyEntries,
        periodStart,
        periodEnd,
      )
      const csv = buildDailyLogCsv(dailyEntries, t, sex, {
        customMetrics: bundle.customMetrics,
        customMetricEntries: bundle.customMetricEntries,
        tracking: analysisExportTracking,
        mealSlotTimes: mealSlotDefaultTimes,
        eatingReasonLabelOverrides,
      })
      const blob = new Blob([CSV_BOM, csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${resolveExportFileStem(fileStem, periodStart, periodEnd)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      setStatus({ kind: 'exportedCsv', entries: dailyEntries.length })
    } catch {
      setStatus({
        kind: 'error',
        section: 'csv',
        message: t.export.exportCsvFailed,
      })
    }
  }

  // Distinct from handleExportCsv (#219) — same underlying "Daily Log" table,
  // rendered as a Markdown table instead of CSV, for pasting into a notes
  // app or a Markdown-rendering chat tool rather than a spreadsheet.
  async function handleExportMarkdown() {
    setStatus({ kind: 'exportingMarkdown' })
    try {
      const bundle = await exportAllData()
      const dailyEntries = filterByExportPeriod(
        bundle.dailyEntries,
        periodStart,
        periodEnd,
      )
      const markdown = buildDailyLogMarkdown(dailyEntries, t, sex, {
        customMetrics: bundle.customMetrics,
        customMetricEntries: bundle.customMetricEntries,
        tracking: analysisExportTracking,
        mealSlotTimes: mealSlotDefaultTimes,
        eatingReasonLabelOverrides,
      })
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${resolveExportFileStem(fileStem, periodStart, periodEnd)}.md`
      link.click()
      URL.revokeObjectURL(url)
      setStatus({
        kind: 'exportedMarkdown',
        entries: dailyEntries.length,
      })
    } catch {
      setStatus({
        kind: 'error',
        section: 'markdown',
        message: t.export.exportMarkdownFailed,
      })
    }
  }

  // #609/#624 — a one-page PDF summary for sharing outside the app, scoped
  // to its own free-form date range (pdfPeriodStart/pdfPeriodEnd) — a
  // deliberately separate picker from the shared periodStart/periodEnd
  // above (see that state's own comment for why blank isn't a valid
  // default here the way it is for Excel/CSV/Markdown).
  //
  // #630 — computes the section data/availability *before* opening
  // PdfSectionsDialog, reusing the same transient `exportingPdf` status
  // to disable the trigger button while this runs. `handleExportPdf`
  // (below) reuses `pdfPreviewData`/`pdfCustomMetricSummaries` rather than
  // reading IndexedDB a second time for the same short-lived round trip.
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

  async function handleExportPdf(sections: PdfSections) {
    if (!pdfPreviewData) return
    setStatus({ kind: 'exportingPdf' })
    try {
      const blob = await buildSummaryPdf(
        pdfPreviewData,
        t,
        locale,
        unit,
        sections,
        pdfCustomMetricSummaries,
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `turtle-steps-summary-${exportPeriodFileStamp(pdfPeriodStart, pdfPeriodEnd)}.pdf`
      link.click()
      URL.revokeObjectURL(url)
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

  // #285 — importAllData writes straight to IndexedDB via its own repository
  // instances, bypassing useMealItemStore/useFoodOverrideStore entirely. Any
  // already-mounted UI reading from those stores (e.g. MealItemsSection's
  // Settings list, already open on this same page) otherwise keeps showing
  // pre-import data until something unrelated happens to remount/reload it.
  // Shared by the plain JSON import and #608's encrypted import below —
  // both land on the same bundle shape once decrypted.
  async function applyImportedBundle(
    bundle: ReturnType<typeof parseExportBundle>,
  ) {
    await importAllData(bundle)
    await Promise.all([
      useMealItemStore.getState().loadItems(),
      useFoodOverrideStore.getState().loadOverrides(),
    ])
    return { goals: bundle.goals.length, entries: bundle.dailyEntries.length }
  }

  async function handleImportFile(file: File) {
    setStatus({ kind: 'importing' })
    try {
      assertImportFileWithinSizeLimit(file)
      const text = await file.text()
      const raw: unknown = JSON.parse(text)
      // #608 — an encrypted backup is a plain JSON envelope (not the bundle
      // itself), so it parses fine here but would fail `parseExportBundle`.
      // Detect it first and hand off to the password dialog instead of
      // falling through to the generic "invalid backup" error below.
      if (isEncryptedBackupEnvelope(raw)) {
        setPendingEncryptedEnvelope(raw)
        setEncryptedImportError(null)
        setStatus({ kind: 'idle' })
        return
      }
      const bundle = parseExportBundle(raw)
      const { goals, entries } = await applyImportedBundle(bundle)
      setStatus({ kind: 'imported', goals, entries })
    } catch (err) {
      const message =
        err instanceof ImportFileTooLargeError
          ? t.export.fileTooLarge
          : err instanceof InvalidBackupFileError
          ? t.export.invalidBackup
          : err instanceof SyntaxError
            ? t.export.notValidJson
            : t.export.importFailed
      setStatus({ kind: 'error', section: 'jsonImport', message })
    }
  }

  async function handleEncryptedImportSubmit(password: string) {
    if (!pendingEncryptedEnvelope) return
    setStatus({ kind: 'importingEncrypted' })
    try {
      const json = await decryptBackupJson(pendingEncryptedEnvelope, password)
      const raw: unknown = JSON.parse(json)
      const bundle = parseExportBundle(raw)
      const { goals, entries } = await applyImportedBundle(bundle)
      setPendingEncryptedEnvelope(null)
      setEncryptedImportError(null)
      setStatus({ kind: 'importedEncrypted', goals, entries })
    } catch (err) {
      if (err instanceof WrongBackupPasswordError) {
        setEncryptedImportError(t.export.wrongEncryptedBackupPassword)
        setStatus({ kind: 'idle' })
        return
      }
      setPendingEncryptedEnvelope(null)
      setEncryptedImportError(null)
      const message =
        err instanceof InvalidBackupFileError
          ? t.export.invalidBackup
          : err instanceof SyntaxError
            ? t.export.notValidJson
            : t.export.importFailed
      setStatus({ kind: 'error', section: 'encryptedImport', message })
    }
  }

  return (
    <>
      <CardHeader>
        <CardTitle>{t.export.title}</CardTitle>
        <CardDescription>{t.export.description}</CardDescription>
        {storageUsage !== null && (
          <p className="text-xs text-muted-foreground">
            {storageQuota !== null
              ? t.export.storageUsedOfQuotaLabel(
                  formatBytes(storageUsage),
                  formatBytes(storageQuota),
                )
              : t.export.storageUsedLabel(formatBytes(storageUsage))}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {t.export.exportBlurb}
          </p>
          <p className="text-xs text-muted-foreground" role="status">
            {lastExportedAt === null
              ? t.export.lastBackupNeverLabel
              : t.export.lastBackupAgoLabel(
                  daysSince(lastExportedAt, new Date()),
                )}
          </p>
          <Button
            onClick={handleExport}
            className="self-start"
            disabled={status.kind === 'exporting'}
          >
            {status.kind === 'exporting'
              ? t.export.exportingButton
              : t.export.exportButton}
          </Button>
          {status.kind === 'exported' && (
            <SectionStatus>
              {t.export.exportedSummary(
                t.export.summary(status.goals, status.entries),
              )}
            </SectionStatus>
          )}
          {sectionErrorMessage(status, 'jsonBackup') && (
            <SectionStatus error>
              {sectionErrorMessage(status, 'jsonBackup')!}
            </SectionStatus>
          )}
        </div>

        {/* #240 — applies to Excel/CSV/Markdown below, not the JSON backup
         * above (a backup should stay complete). */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            {t.export.exportPeriodLabel}
          </span>
          <p className="text-sm text-muted-foreground">
            {t.export.exportPeriodDescription}
          </p>
          <ToggleGroup
            type="single"
            aria-label={t.export.exportPeriodLabel}
            value={rangePreset}
            onValueChange={(value) => {
              if (value) applyRangePreset(value as ExportRangePreset)
            }}
            className="flex flex-wrap justify-start"
          >
            <ToggleGroupItem value="week" className="h-12">
              {t.export.exportRangeWeek}
            </ToggleGroupItem>
            <ToggleGroupItem value="month" className="h-12">
              {t.export.exportRangeMonth}
            </ToggleGroupItem>
            <ToggleGroupItem value="year" className="h-12">
              {t.export.exportRangeYear}
            </ToggleGroupItem>
            <ToggleGroupItem value="all" className="h-12">
              {t.export.exportRangeAll}
            </ToggleGroupItem>
            <ToggleGroupItem value="custom" className="h-12">
              {t.export.exportRangeCustom}
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label={`${t.export.exportPeriodLabel} — ${t.dashboard.rangeStartLabel}`}
              value={periodStart}
              max={periodEnd || undefined}
              onChange={(e) =>
                setPeriodRange(e.target.value, periodEnd, 'custom')
              }
              className="h-12"
            />
            <Input
              type="date"
              aria-label={`${t.export.exportPeriodLabel} — ${t.dashboard.rangeEndLabel}`}
              value={periodEnd}
              min={periodStart || undefined}
              onChange={(e) =>
                setPeriodRange(periodStart, e.target.value, 'custom')
              }
              className="h-12"
            />
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t.export.exportFileNameLabel}
            </span>
            <Input
              type="text"
              aria-label={t.export.exportFileNameLabel}
              value={fileStem}
              onChange={(e) => setFileStem(e.target.value)}
              className="h-12"
            />
          </label>
        </div>

        {/* #370 — a second, clearly separate JSON export from the always-
         * complete one above, scoped to the period picker above. */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {t.export.exportRangedBackupBlurb}
          </p>
          <Button
            variant="outline"
            onClick={handleExportRangedBackup}
            className="self-start"
            disabled={status.kind === 'exportingRangedBackup'}
          >
            {status.kind === 'exportingRangedBackup'
              ? t.export.exportingRangedBackupButton
              : t.export.exportRangedBackupButton}
          </Button>
          {status.kind === 'exportedRangedBackup' && (
            <SectionStatus>
              {t.export.exportedSummary(
                t.export.summary(status.goals, status.entries),
              )}
            </SectionStatus>
          )}
          {sectionErrorMessage(status, 'rangedBackup') && (
            <SectionStatus error>
              {sectionErrorMessage(status, 'rangedBackup')!}
            </SectionStatus>
          )}
        </div>

        {/* #608 — a third JSON export, encrypted client-side via Web Crypto
         * (AES-GCM, password-derived key). Neither backup above changes —
         * this is an opt-in alternative for a device the user trusts less
         * (shared computer, cloud-synced folder), not a replacement. */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {t.export.encryptedBackupBlurb}
          </p>
          <Button
            variant="outline"
            onClick={() => setIsEncryptedExportDialogOpen(true)}
            className="self-start"
          >
            {t.export.exportEncryptedButton}
          </Button>
          {status.kind === 'exportedEncrypted' && (
            <SectionStatus>{t.export.exportedEncryptedSummary}</SectionStatus>
          )}
          {sectionErrorMessage(status, 'encryptedBackup') && (
            <SectionStatus error>
              {sectionErrorMessage(status, 'encryptedBackup')!}
            </SectionStatus>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {t.export.exportExcelBlurb}
          </p>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="self-start"
            disabled={status.kind === 'exportingExcel'}
          >
            {status.kind === 'exportingExcel'
              ? t.export.exportingExcelButton
              : t.export.exportExcelButton}
          </Button>
          {status.kind === 'exportedExcel' && (
            <SectionStatus>
              {t.export.exportedSummary(
                t.export.summary(status.goals, status.entries),
              )}
            </SectionStatus>
          )}
          {sectionErrorMessage(status, 'excel') && (
            <SectionStatus error>
              {sectionErrorMessage(status, 'excel')!}
            </SectionStatus>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {t.export.exportCsvBlurb}
          </p>
          <div className="flex items-center gap-1.5 self-start">
            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={status.kind === 'exportingCsv'}
            >
              {status.kind === 'exportingCsv'
                ? t.export.exportingCsvButton
                : t.export.exportCsvButton}
            </Button>
            <InfoTooltip
              text={t.export.exportCsvLlmTooltip}
              label={t.export.exportCsvLlmTooltipLabel}
            />
          </div>
          {status.kind === 'exportedCsv' && (
            <SectionStatus>
              {t.export.exportedCsvSummary(status.entries)}
            </SectionStatus>
          )}
          {sectionErrorMessage(status, 'csv') && (
            <SectionStatus error>
              {sectionErrorMessage(status, 'csv')!}
            </SectionStatus>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {t.export.exportMarkdownBlurb}
          </p>
          <Button
            variant="outline"
            onClick={handleExportMarkdown}
            className="self-start"
            disabled={status.kind === 'exportingMarkdown'}
          >
            {status.kind === 'exportingMarkdown'
              ? t.export.exportingMarkdownButton
              : t.export.exportMarkdownButton}
          </Button>
          {status.kind === 'exportedMarkdown' && (
            <SectionStatus>
              {t.export.exportedMarkdownSummary(status.entries)}
            </SectionStatus>
          )}
          {sectionErrorMessage(status, 'markdown') && (
            <SectionStatus error>
              {sectionErrorMessage(status, 'markdown')!}
            </SectionStatus>
          )}
        </div>

        {/* #609/#624 — a one-page PDF summary (weight trend, weekly
         * averages, optional body measurements, non-medical disclaimer),
         * for sharing outside the app. Own free-form date range (not the
         * shared period picker above — see pdfPeriodStart's own comment)
         * with two quick-fill shortcuts for the common "last 30/90 days"
         * cases, matching the two-`Input` period-picker pattern used
         * above rather than the original fixed 30/90-day toggle. */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {t.export.exportPdfBlurb}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPdfPeriodStart(format(subDays(new Date(), 29), 'yyyy-MM-dd'))
                setPdfPeriodEnd(format(new Date(), 'yyyy-MM-dd'))
              }}
            >
              {t.export.exportPdfRange30Label}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPdfPeriodStart(format(subDays(new Date(), 89), 'yyyy-MM-dd'))
                setPdfPeriodEnd(format(new Date(), 'yyyy-MM-dd'))
              }}
            >
              {t.export.exportPdfRange90Label}
            </Button>
          </div>
          <span className="text-sm font-medium">
            {t.export.exportPdfRangeLabel}
          </span>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label={`${t.export.exportPdfRangeLabel} — ${t.dashboard.rangeStartLabel}`}
              value={pdfPeriodStart}
              max={pdfPeriodEnd}
              onChange={(e) => setPdfPeriodStart(e.target.value)}
              className="h-12"
            />
            <Input
              type="date"
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
          {status.kind === 'exportedPdf' && (
            <SectionStatus>{t.export.exportedPdfSummary}</SectionStatus>
          )}
          {sectionErrorMessage(status, 'pdf') && (
            <SectionStatus error>
              {sectionErrorMessage(status, 'pdf')!}
            </SectionStatus>
          )}
        </div>

        <div className="flex flex-col gap-2 section-shell p-3">
          <p className="text-sm text-muted-foreground">
            {t.export.importBlurb}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImportFile(file)
              e.target.value = ''
            }}
          />
          <Button
            variant="outline"
            className="self-start"
            onClick={() => fileInputRef.current?.click()}
            disabled={status.kind === 'importing'}
          >
            {status.kind === 'importing'
              ? t.export.importingButton
              : t.export.importButton}
          </Button>
          {status.kind === 'imported' && (
            <SectionStatus>
              {t.export.importedSummary(
                t.export.summary(status.goals, status.entries),
              )}
            </SectionStatus>
          )}
          {sectionErrorMessage(status, 'jsonImport') && (
            <SectionStatus error>
              {sectionErrorMessage(status, 'jsonImport')!}
            </SectionStatus>
          )}
          {/* #608 — same file input/button above; an encrypted envelope is
           * detected inside handleImportFile and routed to the password
           * dialog instead, so its own result renders here too. */}
          {status.kind === 'importedEncrypted' && (
            <SectionStatus>
              {t.export.importedSummary(
                t.export.summary(status.goals, status.entries),
              )}
            </SectionStatus>
          )}
          {sectionErrorMessage(status, 'encryptedImport') && (
            <SectionStatus error>
              {sectionErrorMessage(status, 'encryptedImport')!}
            </SectionStatus>
          )}
        </div>

        <ThirdPartyImportSection />
      </CardContent>
      <EncryptedBackupExportDialog
        open={isEncryptedExportDialogOpen}
        onOpenChange={setIsEncryptedExportDialogOpen}
        onSubmit={handleExportEncrypted}
        submitting={status.kind === 'exportingEncrypted'}
      />
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
      />
      <EncryptedBackupImportDialog
        open={pendingEncryptedEnvelope !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingEncryptedEnvelope(null)
            setEncryptedImportError(null)
          }
        }}
        onSubmit={handleEncryptedImportSubmit}
        error={encryptedImportError}
        submitting={status.kind === 'importingEncrypted'}
      />
    </>
  )
}
