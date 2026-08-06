import { useEffect, useRef, useState } from 'react'
import { format, subDays } from 'date-fns'
import { type Dictionary, useLocale, useTranslation } from '@/i18n'
import {
  useAlcoholTrackingStore,
  useCustomMetricStore,
  useCycleTrackingStore,
  useDigestionTrackingStore,
  useFoodOverrideStore,
  useLastBackupStore,
  useMealItemStore,
  useMealSlotDefaultTimesStore,
  useProfileStore,
  useTrackedFieldsStore,
  useUnitStore,
  useWaterTrackingStore,
  useWeekStartStore,
} from '@/stores'
import { Button } from '@/shared/ui/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
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
  type PdfSections,
  type PdfSummaryData,
} from './exportPdf'
import { buildExportWorkbook } from './exportXlsx'
import { ImportConflictModePicker } from './ImportConflictModePicker'
import { ImportFieldPicker } from './ImportFieldPicker'
import { PdfSectionsDialog } from './PdfSectionsDialog'
import type {
  DailyEntryImportMode,
  DailyEntryPatch,
} from './mergeDailyEntryPatches'
import {
  importZeppLifeExport,
  ZeppLifeInvalidFileError,
  ZeppLifeMultipleProfilesError,
  ZeppLifeWrongPasswordError,
} from './zeppLife/importZeppLife'
import { ZeppLifePasswordDialog } from './zeppLife/ZeppLifePasswordDialog'
import { ZeppLifeProfileDialog } from './zeppLife/ZeppLifeProfileDialog'
import type { ZeppBodyProfile } from './zeppLife/zeppLifeParser'
import {
  AppleHealthInvalidFileError,
  importAppleHealthExport,
} from './appleHealth/importAppleHealth'
import {
  importMyFitnessPalExport,
  isMyFitnessPalEncrypted,
  MyFitnessPalInvalidFileError,
  MyFitnessPalWrongPasswordError,
} from './myFitnessPal/importMyFitnessPal'
import { MyFitnessPalPasswordDialog } from './myFitnessPal/MyFitnessPalPasswordDialog'
import { MyFitnessPalSlotTimesDialog } from './myFitnessPal/MyFitnessPalSlotTimesDialog'
import type { MealSlotDefaultTimes } from '@/shared/lib/mealLabel'

/** #369 — each source's own data types, since Zepp Life and Apple Health
 * expose different fields (Zepp: body-composition scale readings; Apple
 * Health: waist/water instead). All keys are selected by default so an
 * untouched picker preserves the pre-#369 "import everything" behavior. */
const ZEPP_LIFE_FIELDS: {
  key: keyof DailyEntryPatch
  label: (t: Dictionary) => string
}[] = [
  { key: 'weightKg', label: (t) => t.dailyEntry.weightLabel },
  { key: 'bodyFatPercent', label: (t) => t.dailyEntry.bodyFatLabel },
  { key: 'bodyWaterPercent', label: (t) => t.dailyEntry.bodyWaterLabel },
  { key: 'boneMassKg', label: (t) => t.dailyEntry.boneMassLabel },
  { key: 'visceralFatRating', label: (t) => t.dailyEntry.visceralFatLabel },
  { key: 'muscleMassKg', label: (t) => t.dailyEntry.muscleMassLabel },
  { key: 'steps', label: (t) => t.dailyEntry.stepsLabel },
]

const APPLE_HEALTH_FIELDS: {
  key: keyof DailyEntryPatch
  label: (t: Dictionary) => string
}[] = [
  { key: 'weightKg', label: (t) => t.dailyEntry.weightLabel },
  { key: 'bodyFatPercent', label: (t) => t.dailyEntry.bodyFatLabel },
  { key: 'waistCm', label: (t) => t.dailyEntry.waistLabel },
  { key: 'steps', label: (t) => t.dailyEntry.stepsLabel },
  { key: 'waterEntries', label: (t) => t.dailyEntry.waterLabel },
  // #368 — sleepHours/deepSleepHours added once Apple Health's own sleep
  // parsing existed; every other field here was already pickable, so these
  // two get the same treatment rather than being unconditionally imported.
  { key: 'sleepHours', label: (t) => t.dailyEntry.sleepLabel },
  { key: 'deepSleepHours', label: (t) => t.dailyEntry.deepSleepLabel },
  // #411 — same reasoning as #368 above, once menstrual flow parsing
  // existed. Offered unconditionally like every other field here, even
  // though the app's own manual onPeriod toggle is gated behind a
  // Settings opt-in (useCycleTrackingStore) — this picker has no
  // precedent for gating any field behind a tracking-enabled store (e.g.
  // waterEntries isn't gated behind water tracking either).
  { key: 'onPeriod', label: (t) => t.dailyEntry.onPeriodLabel },
]

// #367 — meals are this import's actual payoff (#365/#366 never touch
// calorieEntries at all), weight a clean bonus using the same scalar shape
// those two already established.
const MYFITNESSPAL_FIELDS: {
  key: keyof DailyEntryPatch
  label: (t: Dictionary) => string
}[] = [
  { key: 'calorieEntries', label: (t) => t.dailyEntry.mealsLabel },
  { key: 'weightKg', label: (t) => t.dailyEntry.weightLabel },
]

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
  | 'zepp'
  | 'apple'
  | 'mfp'

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
  | { kind: 'importingZeppLife' }
  | { kind: 'importedZeppLife'; daysImported: number; daysUpdated: number }
  | { kind: 'importingAppleHealth'; progress: number }
  | { kind: 'importedAppleHealth'; daysImported: number; daysUpdated: number }
  | { kind: 'importingMyFitnessPal' }
  | { kind: 'importedMyFitnessPal'; daysImported: number; daysUpdated: number }
  /** #617 — `section` keeps the alert under the matching export/import block. */
  | { kind: 'error'; section: StatusSection; message: string }

function sectionErrorMessage(
  status: Status,
  section: StatusSection,
): string | null {
  return status.kind === 'error' && status.section === section
    ? status.message
    : null
}

function SectionStatus({
  children,
  error,
}: {
  children: string
  error?: boolean
}) {
  if (error) {
    return (
      <p
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {children}
      </p>
    )
  }
  return <p className="text-sm text-muted-foreground">{children}</p>
}

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
  const zeppLifeFileInputRef = useRef<HTMLInputElement>(null)
  const [zeppLifePendingFile, setZeppLifePendingFile] = useState<File | null>(
    null,
  )
  const [zeppLifePendingPassword, setZeppLifePendingPassword] = useState<
    string | null
  >(null)
  const [zeppLifeDialogOpen, setZeppLifeDialogOpen] = useState(false)
  const [zeppLifeProfileDialogOpen, setZeppLifeProfileDialogOpen] =
    useState(false)
  const [zeppLifeProfiles, setZeppLifeProfiles] = useState<ZeppBodyProfile[]>(
    [],
  )
  const zeppLifeAdvancingRef = useRef(false)
  const [zeppLifePasswordError, setZeppLifePasswordError] = useState<
    string | null
  >(null)
  const appleHealthFileInputRef = useRef<HTMLInputElement>(null)
  // #369 — all fields selected by default, so an untouched picker imports
  // everything, matching pre-#369 behavior exactly.
  const [zeppLifeSelectedFields, setZeppLifeSelectedFields] = useState<
    Set<string>
  >(() => new Set(ZEPP_LIFE_FIELDS.map((field) => field.key)))
  // #496 — safer default: fill gaps only so a re-import does not wipe
  // manual corrections (e.g. fixing an abnormal Zepp weight).
  const [zeppLifeImportMode, setZeppLifeImportMode] =
    useState<DailyEntryImportMode>('fillGaps')
  const [appleHealthSelectedFields, setAppleHealthSelectedFields] = useState<
    Set<string>
  >(() => new Set(APPLE_HEALTH_FIELDS.map((field) => field.key)))
  const [appleHealthImportMode, setAppleHealthImportMode] =
    useState<DailyEntryImportMode>('fillGaps')
  const myFitnessPalFileInputRef = useRef<HTMLInputElement>(null)
  /** Skips clearing pending MFP state when closing the slot-times dialog
   * only to open the password dialog (#588). */
  const myFitnessPalAdvancingRef = useRef(false)
  const [myFitnessPalPendingFile, setMyFitnessPalPendingFile] =
    useState<File | null>(null)
  const [myFitnessPalPendingSlotTimes, setMyFitnessPalPendingSlotTimes] =
    useState<MealSlotDefaultTimes | null>(null)
  const [myFitnessPalNeedsPassword, setMyFitnessPalNeedsPassword] =
    useState(false)
  const [myFitnessPalDialogOpen, setMyFitnessPalDialogOpen] = useState(false)
  const [myFitnessPalSlotTimesDialogOpen, setMyFitnessPalSlotTimesDialogOpen] =
    useState(false)
  const [myFitnessPalPasswordError, setMyFitnessPalPasswordError] = useState<
    string | null
  >(null)
  const mealSlotDefaultTimes = useMealSlotDefaultTimesStore(
    (state) => state.times,
  )
  const setMealSlotDefaultTimes = useMealSlotDefaultTimesStore(
    (state) => state.setTimes,
  )
  const [myFitnessPalSelectedFields, setMyFitnessPalSelectedFields] = useState<
    Set<string>
  >(() => new Set(MYFITNESSPAL_FIELDS.map((field) => field.key)))
  const [myFitnessPalImportMode, setMyFitnessPalImportMode] =
    useState<DailyEntryImportMode>('fillGaps')
  const [storageUsage, setStorageUsage] = useState<number | null>(null)
  const [storageQuota, setStorageQuota] = useState<number | null>(null)
  // #240 — optional, applies to Excel/CSV/Markdown only (see
  // filterByExportPeriod's own note).
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

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
      link.download = `turtle-steps-backup-ranged-${format(new Date(), 'yyyy-MM-dd')}.json`
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
      )
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `turtle-steps-export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
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
      const csv = buildDailyLogCsv(dailyEntries, t, sex)
      const blob = new Blob([CSV_BOM, csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `turtle-steps-daily-log-${format(new Date(), 'yyyy-MM-dd')}.csv`
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
      const markdown = buildDailyLogMarkdown(dailyEntries, t, sex)
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `turtle-steps-daily-log-${format(new Date(), 'yyyy-MM-dd')}.md`
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
      link.download = `turtle-steps-summary-${pdfPeriodEnd}.pdf`
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
        err instanceof InvalidBackupFileError
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

  function clearZeppLifeImportFlow() {
    setZeppLifePendingFile(null)
    setZeppLifePendingPassword(null)
    setZeppLifePasswordError(null)
    setZeppLifeProfiles([])
  }

  function handleZeppLifeFileSelected(file: File) {
    setZeppLifePendingFile(file)
    setZeppLifePendingPassword(null)
    setZeppLifePasswordError(null)
    setZeppLifeProfiles([])
    setZeppLifeDialogOpen(true)
  }

  async function runZeppLifeImport(
    password: string,
    selectedHeightCm?: number,
  ) {
    if (!zeppLifePendingFile) return
    setStatus({ kind: 'importingZeppLife' })
    try {
      const { daysImported, daysUpdated } = await importZeppLifeExport(
        zeppLifePendingFile,
        password,
        zeppLifeSelectedFields as ReadonlySet<keyof DailyEntryPatch>,
        zeppLifeImportMode,
        selectedHeightCm,
      )
      setZeppLifeDialogOpen(false)
      setZeppLifeProfileDialogOpen(false)
      clearZeppLifeImportFlow()
      setStatus({ kind: 'importedZeppLife', daysImported, daysUpdated })
    } catch (err) {
      if (err instanceof ZeppLifeWrongPasswordError) {
        setZeppLifePasswordError(t.zeppLifeImport.wrongPassword)
        setStatus({ kind: 'idle' })
        return
      }
      if (err instanceof ZeppLifeMultipleProfilesError) {
        // #616 — keep file + password, advance to the profile picker.
        setZeppLifePendingPassword(password)
        setZeppLifeProfiles(err.profiles)
        zeppLifeAdvancingRef.current = true
        setZeppLifeDialogOpen(false)
        setZeppLifeProfileDialogOpen(true)
        zeppLifeAdvancingRef.current = false
        setStatus({ kind: 'idle' })
        return
      }
      setZeppLifeDialogOpen(false)
      setZeppLifeProfileDialogOpen(false)
      clearZeppLifeImportFlow()
      const message =
        err instanceof ZeppLifeInvalidFileError
          ? t.zeppLifeImport.invalidFile
          : t.zeppLifeImport.importFailed
      setStatus({ kind: 'error', section: 'zepp', message })
    }
  }

  async function handleZeppLifePasswordSubmit(password: string) {
    await runZeppLifeImport(password)
  }

  async function handleZeppLifeProfileSubmit(heightCm: number) {
    if (!zeppLifePendingPassword) return
    await runZeppLifeImport(zeppLifePendingPassword, heightCm)
  }

  async function handleAppleHealthFileSelected(file: File) {
    setStatus({ kind: 'importingAppleHealth', progress: 0 })
    try {
      const { daysImported, daysUpdated } = await importAppleHealthExport(
        file,
        (fraction) => {
          setStatus({
            kind: 'importingAppleHealth',
            progress: Math.round(fraction * 100),
          })
        },
        appleHealthSelectedFields as ReadonlySet<keyof DailyEntryPatch>,
        appleHealthImportMode,
      )
      setStatus({ kind: 'importedAppleHealth', daysImported, daysUpdated })
    } catch (err) {
      const message =
        err instanceof AppleHealthInvalidFileError
          ? t.appleHealthImport.invalidFile
          : t.appleHealthImport.importFailed
      setStatus({ kind: 'error', section: 'apple', message })
    }
  }

  async function handleMyFitnessPalFileSelected(file: File) {
    // #500 — encrypted Data Access Request exports are OLE (MS-OFFCRYPTO)
    // and need the email password before exceljs can read them; plain
    // unencrypted .xlsx still works without one.
    // #588 — always prompt for Breakfast/Lunch/Snack/Dinner default times
    // first (prefilled from remembered prefs); password comes after when
    // needed, then import stamps the chosen clocks.
    try {
      const buffer = await file.arrayBuffer()
      const encrypted = isMyFitnessPalEncrypted(buffer)
      setMyFitnessPalPendingFile(file)
      setMyFitnessPalPasswordError(null)
      setMyFitnessPalNeedsPassword(encrypted)
      setMyFitnessPalSlotTimesDialogOpen(true)
    } catch {
      setStatus({
        kind: 'error',
        section: 'mfp',
        message: t.myFitnessPalImport.invalidFile,
      })
    }
  }

  function clearMyFitnessPalImportFlow() {
    setMyFitnessPalPendingFile(null)
    setMyFitnessPalPendingSlotTimes(null)
    setMyFitnessPalNeedsPassword(false)
    setMyFitnessPalPasswordError(null)
  }

  function handleMyFitnessPalSlotTimesConfirm(times: MealSlotDefaultTimes) {
    setMealSlotDefaultTimes(times)
    setMyFitnessPalPendingSlotTimes(times)
    if (myFitnessPalNeedsPassword) {
      myFitnessPalAdvancingRef.current = true
      setMyFitnessPalSlotTimesDialogOpen(false)
      setMyFitnessPalDialogOpen(true)
      myFitnessPalAdvancingRef.current = false
      return
    }
    setMyFitnessPalSlotTimesDialogOpen(false)
    if (!myFitnessPalPendingFile) return
    void runMyFitnessPalImport(myFitnessPalPendingFile, undefined, times)
  }

  async function handleMyFitnessPalPasswordSubmit(password: string) {
    if (!myFitnessPalPendingFile) return
    await runMyFitnessPalImport(
      myFitnessPalPendingFile,
      password,
      myFitnessPalPendingSlotTimes ?? mealSlotDefaultTimes,
    )
  }

  async function runMyFitnessPalImport(
    file: File,
    password?: string,
    slotTimes: MealSlotDefaultTimes = mealSlotDefaultTimes,
  ) {
    setStatus({ kind: 'importingMyFitnessPal' })
    try {
      const { daysImported, daysUpdated } = await importMyFitnessPalExport(
        file,
        myFitnessPalSelectedFields as ReadonlySet<keyof DailyEntryPatch>,
        myFitnessPalImportMode,
        password,
        slotTimes,
      )
      setMyFitnessPalDialogOpen(false)
      setMyFitnessPalSlotTimesDialogOpen(false)
      clearMyFitnessPalImportFlow()
      setStatus({ kind: 'importedMyFitnessPal', daysImported, daysUpdated })
    } catch (err) {
      if (err instanceof MyFitnessPalWrongPasswordError) {
        setMyFitnessPalPasswordError(t.myFitnessPalImport.wrongPassword)
        setMyFitnessPalDialogOpen(true)
        setStatus({ kind: 'idle' })
        return
      }
      setMyFitnessPalDialogOpen(false)
      setMyFitnessPalSlotTimesDialogOpen(false)
      clearMyFitnessPalImportFlow()
      const message =
        err instanceof MyFitnessPalInvalidFileError
          ? t.myFitnessPalImport.invalidFile
          : t.myFitnessPalImport.importFailed
      setStatus({ kind: 'error', section: 'mfp', message })
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
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label={`${t.export.exportPeriodLabel} — ${t.dashboard.rangeStartLabel}`}
              value={periodStart}
              max={periodEnd || undefined}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="h-10"
            />
            <Input
              type="date"
              aria-label={`${t.export.exportPeriodLabel} — ${t.dashboard.rangeEndLabel}`}
              value={periodEnd}
              min={periodStart || undefined}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="h-10"
            />
          </div>
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
              className="h-10"
            />
            <Input
              type="date"
              aria-label={`${t.export.exportPdfRangeLabel} — ${t.dashboard.rangeEndLabel}`}
              value={pdfPeriodEnd}
              min={pdfPeriodStart}
              onChange={(e) => setPdfPeriodEnd(e.target.value)}
              className="h-10"
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

        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
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

        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <p className="text-sm text-muted-foreground">
            {t.zeppLifeImport.importBlurb}
          </p>
          {/* #381 — the exact menu path lives here (a third-party app's own
           * UI, so it's presented as an aside rather than folded into the
           * main blurb, which describes what this app does with the file). */}
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer font-medium">
              {t.zeppLifeImport.howToExportLabel}
            </summary>
            <p className="mt-1">{t.zeppLifeImport.howToExportSteps}</p>
          </details>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t.export.dataToImportLabel}
            </span>
            <ImportFieldPicker
              ariaLabel={`${t.zeppLifeImport.importButton} — ${t.export.dataToImportLabel}`}
              fields={ZEPP_LIFE_FIELDS.map((field) => ({
                key: field.key,
                label: field.label(t),
              }))}
              selected={zeppLifeSelectedFields}
              onChange={setZeppLifeSelectedFields}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t.export.importConflictModeLabel}
            </span>
            <p className="text-sm text-muted-foreground">
              {t.export.importConflictModeDescription}
            </p>
            <ImportConflictModePicker
              ariaLabel={`${t.zeppLifeImport.importButton} — ${t.export.importConflictModeLabel}`}
              value={zeppLifeImportMode}
              onChange={setZeppLifeImportMode}
              fillGapsLabel={t.export.importConflictModeFillGaps}
              overwriteLabel={t.export.importConflictModeOverwrite}
            />
          </div>
          <input
            ref={zeppLifeFileInputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleZeppLifeFileSelected(file)
              e.target.value = ''
            }}
          />
          <Button
            variant="outline"
            className="self-start"
            onClick={() => zeppLifeFileInputRef.current?.click()}
            disabled={
              status.kind === 'importingZeppLife' ||
              zeppLifeSelectedFields.size === 0
            }
          >
            {status.kind === 'importingZeppLife'
              ? t.zeppLifeImport.importingButton
              : t.zeppLifeImport.importButton}
          </Button>
          {status.kind === 'importedZeppLife' && (
            <SectionStatus>
              {status.daysImported === 0
                ? t.zeppLifeImport.importedNothingSummary
                : t.zeppLifeImport.importedSummary(
                    status.daysImported,
                    status.daysUpdated,
                  )}
            </SectionStatus>
          )}
          {sectionErrorMessage(status, 'zepp') && (
            <SectionStatus error>
              {sectionErrorMessage(status, 'zepp')!}
            </SectionStatus>
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <p className="text-sm text-muted-foreground">
            {t.appleHealthImport.importBlurb}
          </p>
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer font-medium">
              {t.appleHealthImport.howToExportLabel}
            </summary>
            <p className="mt-1">{t.appleHealthImport.howToExportSteps}</p>
          </details>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t.export.dataToImportLabel}
            </span>
            <ImportFieldPicker
              ariaLabel={`${t.appleHealthImport.importButton} — ${t.export.dataToImportLabel}`}
              fields={APPLE_HEALTH_FIELDS.map((field) => ({
                key: field.key,
                label: field.label(t),
              }))}
              selected={appleHealthSelectedFields}
              onChange={setAppleHealthSelectedFields}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t.export.importConflictModeLabel}
            </span>
            <p className="text-sm text-muted-foreground">
              {t.export.importConflictModeDescription}
            </p>
            <ImportConflictModePicker
              ariaLabel={`${t.appleHealthImport.importButton} — ${t.export.importConflictModeLabel}`}
              value={appleHealthImportMode}
              onChange={setAppleHealthImportMode}
              fillGapsLabel={t.export.importConflictModeFillGaps}
              overwriteLabel={t.export.importConflictModeOverwrite}
            />
          </div>
          <input
            ref={appleHealthFileInputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleAppleHealthFileSelected(file)
              e.target.value = ''
            }}
          />
          <Button
            variant="outline"
            className="self-start"
            onClick={() => appleHealthFileInputRef.current?.click()}
            disabled={
              status.kind === 'importingAppleHealth' ||
              appleHealthSelectedFields.size === 0
            }
          >
            {status.kind === 'importingAppleHealth'
              ? t.appleHealthImport.importingButton(status.progress)
              : t.appleHealthImport.importButton}
          </Button>
          {status.kind === 'importedAppleHealth' && (
            <SectionStatus>
              {status.daysImported === 0
                ? t.appleHealthImport.importedNothingSummary
                : t.appleHealthImport.importedSummary(
                    status.daysImported,
                    status.daysUpdated,
                  )}
            </SectionStatus>
          )}
          {sectionErrorMessage(status, 'apple') && (
            <SectionStatus error>
              {sectionErrorMessage(status, 'apple')!}
            </SectionStatus>
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <p className="text-sm text-muted-foreground">
            {t.myFitnessPalImport.importBlurb}
          </p>
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer font-medium">
              {t.myFitnessPalImport.howToExportLabel}
            </summary>
            <p className="mt-1">{t.myFitnessPalImport.howToExportSteps}</p>
          </details>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t.export.dataToImportLabel}
            </span>
            <ImportFieldPicker
              ariaLabel={`${t.myFitnessPalImport.importButton} — ${t.export.dataToImportLabel}`}
              fields={MYFITNESSPAL_FIELDS.map((field) => ({
                key: field.key,
                label: field.label(t),
              }))}
              selected={myFitnessPalSelectedFields}
              onChange={setMyFitnessPalSelectedFields}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t.export.importConflictModeLabel}
            </span>
            <p className="text-sm text-muted-foreground">
              {t.export.importConflictModeDescription}
            </p>
            <ImportConflictModePicker
              ariaLabel={`${t.myFitnessPalImport.importButton} — ${t.export.importConflictModeLabel}`}
              value={myFitnessPalImportMode}
              onChange={setMyFitnessPalImportMode}
              fillGapsLabel={t.export.importConflictModeFillGaps}
              overwriteLabel={t.export.importConflictModeOverwrite}
            />
          </div>
          <input
            ref={myFitnessPalFileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleMyFitnessPalFileSelected(file)
              e.target.value = ''
            }}
          />
          <Button
            variant="outline"
            className="self-start"
            onClick={() => myFitnessPalFileInputRef.current?.click()}
            disabled={
              status.kind === 'importingMyFitnessPal' ||
              myFitnessPalSelectedFields.size === 0
            }
          >
            {status.kind === 'importingMyFitnessPal'
              ? t.myFitnessPalImport.importingButton
              : t.myFitnessPalImport.importButton}
          </Button>
          {status.kind === 'importedMyFitnessPal' && (
            <SectionStatus>
              {status.daysImported === 0
                ? t.myFitnessPalImport.importedNothingSummary
                : t.myFitnessPalImport.importedSummary(
                    status.daysImported,
                    status.daysUpdated,
                  )}
            </SectionStatus>
          )}
          {sectionErrorMessage(status, 'mfp') && (
            <SectionStatus error>
              {sectionErrorMessage(status, 'mfp')!}
            </SectionStatus>
          )}
        </div>
      </CardContent>
      <ZeppLifePasswordDialog
        open={zeppLifeDialogOpen}
        onOpenChange={(open) => {
          setZeppLifeDialogOpen(open)
          if (!open && !zeppLifeAdvancingRef.current) {
            clearZeppLifeImportFlow()
          }
        }}
        onSubmit={handleZeppLifePasswordSubmit}
        error={zeppLifePasswordError}
        submitting={status.kind === 'importingZeppLife'}
      />
      <ZeppLifeProfileDialog
        open={zeppLifeProfileDialogOpen}
        onOpenChange={(open) => {
          setZeppLifeProfileDialogOpen(open)
          if (!open) clearZeppLifeImportFlow()
        }}
        profiles={zeppLifeProfiles}
        onSubmit={handleZeppLifeProfileSubmit}
        submitting={status.kind === 'importingZeppLife'}
      />
      <MyFitnessPalSlotTimesDialog
        open={myFitnessPalSlotTimesDialogOpen}
        onOpenChange={(open) => {
          setMyFitnessPalSlotTimesDialogOpen(open)
          if (!open && !myFitnessPalAdvancingRef.current) {
            clearMyFitnessPalImportFlow()
          }
        }}
        initialTimes={mealSlotDefaultTimes}
        onConfirm={handleMyFitnessPalSlotTimesConfirm}
        needsPasswordNext={myFitnessPalNeedsPassword}
        submitting={status.kind === 'importingMyFitnessPal'}
      />
      <MyFitnessPalPasswordDialog
        open={myFitnessPalDialogOpen}
        onOpenChange={(open) => {
          setMyFitnessPalDialogOpen(open)
          if (!open) clearMyFitnessPalImportFlow()
        }}
        onSubmit={handleMyFitnessPalPasswordSubmit}
        error={myFitnessPalPasswordError}
        submitting={status.kind === 'importingMyFitnessPal'}
      />
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
                {
                  sleep: trackedFields.sleep,
                  steps: trackedFields.steps,
                  bodyMeasurements: trackedFields.bodyMeasurements,
                  bodyComposition: trackedFields.bodyComposition,
                  nightEating: trackedFields.nightEating,
                  cycle: cycleTrackingEnabled,
                  digestion: digestionTrackingEnabled,
                  alcohol: alcoholTrackingEnabled,
                  water: waterTrackingEnabled,
                },
              )
            : EMPTY_PDF_SECTION_AVAILABILITY
        }
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
