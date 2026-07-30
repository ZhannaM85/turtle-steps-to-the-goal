import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { type Dictionary, useTranslation } from '@/i18n'
import { useFoodOverrideStore, useMealItemStore, useProfileStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
import {
  exportAllData,
  importAllData,
  InvalidBackupFileError,
  parseExportBundle,
} from './exportActions'
import { buildDailyLogCsv, CSV_BOM } from './exportCsv'
import { buildDailyLogMarkdown } from './exportMarkdown'
import { buildExportWorkbook } from './exportXlsx'
import { ImportFieldPicker } from './ImportFieldPicker'
import type { DailyEntryPatch } from './mergeDailyEntryPatches'
import {
  importZeppLifeExport,
  ZeppLifeInvalidFileError,
  ZeppLifeWrongPasswordError,
} from './zeppLife/importZeppLife'
import { ZeppLifePasswordDialog } from './zeppLife/ZeppLifePasswordDialog'
import {
  AppleHealthInvalidFileError,
  importAppleHealthExport,
} from './appleHealth/importAppleHealth'
import {
  importMyFitnessPalExport,
  MyFitnessPalInvalidFileError,
} from './myFitnessPal/importMyFitnessPal'

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

type Status =
  | { kind: 'idle' }
  | { kind: 'exporting' }
  | { kind: 'exported'; goals: number; entries: number }
  | { kind: 'exportingRangedBackup' }
  | { kind: 'exportedRangedBackup'; goals: number; entries: number }
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
  | { kind: 'error'; message: string }

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
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const zeppLifeFileInputRef = useRef<HTMLInputElement>(null)
  const [zeppLifePendingFile, setZeppLifePendingFile] = useState<File | null>(
    null,
  )
  const [zeppLifeDialogOpen, setZeppLifeDialogOpen] = useState(false)
  const [zeppLifePasswordError, setZeppLifePasswordError] = useState<
    string | null
  >(null)
  const appleHealthFileInputRef = useRef<HTMLInputElement>(null)
  // #369 — all fields selected by default, so an untouched picker imports
  // everything, matching pre-#369 behavior exactly.
  const [zeppLifeSelectedFields, setZeppLifeSelectedFields] = useState<
    Set<string>
  >(() => new Set(ZEPP_LIFE_FIELDS.map((field) => field.key)))
  const [appleHealthSelectedFields, setAppleHealthSelectedFields] = useState<
    Set<string>
  >(() => new Set(APPLE_HEALTH_FIELDS.map((field) => field.key)))
  const myFitnessPalFileInputRef = useRef<HTMLInputElement>(null)
  const [myFitnessPalSelectedFields, setMyFitnessPalSelectedFields] =
    useState<Set<string>>(
      () => new Set(MYFITNESSPAL_FIELDS.map((field) => field.key)),
    )
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
      setStatus({
        kind: 'exported',
        goals: bundle.goals.length,
        entries: bundle.dailyEntries.length,
      })
    } catch {
      setStatus({ kind: 'error', message: t.export.exportFailed })
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
      setStatus({ kind: 'error', message: t.export.exportFailed })
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
      setStatus({ kind: 'error', message: t.export.exportExcelFailed })
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
      setStatus({ kind: 'error', message: t.export.exportCsvFailed })
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
      setStatus({ kind: 'error', message: t.export.exportMarkdownFailed })
    }
  }

  async function handleImportFile(file: File) {
    setStatus({ kind: 'importing' })
    try {
      const text = await file.text()
      const raw: unknown = JSON.parse(text)
      const bundle = parseExportBundle(raw)
      await importAllData(bundle)
      // #285 — importAllData writes straight to IndexedDB via its own
      // repository instances, bypassing useMealItemStore/useFoodOverrideStore
      // entirely. Any already-mounted UI reading from those stores (e.g.
      // MealItemsSection's Settings list, already open on this same page)
      // otherwise keeps showing pre-import data until something unrelated
      // happens to remount and reload them.
      await Promise.all([
        useMealItemStore.getState().loadItems(),
        useFoodOverrideStore.getState().loadOverrides(),
      ])
      setStatus({
        kind: 'imported',
        goals: bundle.goals.length,
        entries: bundle.dailyEntries.length,
      })
    } catch (err) {
      const message =
        err instanceof InvalidBackupFileError
          ? t.export.invalidBackup
          : err instanceof SyntaxError
            ? t.export.notValidJson
            : t.export.importFailed
      setStatus({ kind: 'error', message })
    }
  }

  function handleZeppLifeFileSelected(file: File) {
    setZeppLifePendingFile(file)
    setZeppLifePasswordError(null)
    setZeppLifeDialogOpen(true)
  }

  async function handleZeppLifePasswordSubmit(password: string) {
    if (!zeppLifePendingFile) return
    setStatus({ kind: 'importingZeppLife' })
    try {
      const { daysImported, daysUpdated } = await importZeppLifeExport(
        zeppLifePendingFile,
        password,
        zeppLifeSelectedFields as ReadonlySet<keyof DailyEntryPatch>,
      )
      setZeppLifeDialogOpen(false)
      setZeppLifePendingFile(null)
      setStatus({ kind: 'importedZeppLife', daysImported, daysUpdated })
    } catch (err) {
      if (err instanceof ZeppLifeWrongPasswordError) {
        setZeppLifePasswordError(t.zeppLifeImport.wrongPassword)
        setStatus({ kind: 'idle' })
        return
      }
      setZeppLifeDialogOpen(false)
      setZeppLifePendingFile(null)
      const message =
        err instanceof ZeppLifeInvalidFileError
          ? t.zeppLifeImport.invalidFile
          : t.zeppLifeImport.importFailed
      setStatus({ kind: 'error', message })
    }
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
      )
      setStatus({ kind: 'importedAppleHealth', daysImported, daysUpdated })
    } catch (err) {
      const message =
        err instanceof AppleHealthInvalidFileError
          ? t.appleHealthImport.invalidFile
          : t.appleHealthImport.importFailed
      setStatus({ kind: 'error', message })
    }
  }

  async function handleMyFitnessPalFileSelected(file: File) {
    setStatus({ kind: 'importingMyFitnessPal' })
    try {
      const { daysImported, daysUpdated } = await importMyFitnessPalExport(
        file,
        myFitnessPalSelectedFields as ReadonlySet<keyof DailyEntryPatch>,
      )
      setStatus({ kind: 'importedMyFitnessPal', daysImported, daysUpdated })
    } catch (err) {
      const message =
        err instanceof MyFitnessPalInvalidFileError
          ? t.myFitnessPalImport.invalidFile
          : t.myFitnessPalImport.importFailed
      setStatus({ kind: 'error', message })
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
          <Button
            onClick={handleExport}
            className="self-start"
            disabled={status.kind === 'exporting'}
          >
            {status.kind === 'exporting'
              ? t.export.exportingButton
              : t.export.exportButton}
          </Button>
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
        </div>

        <div className="flex flex-col gap-2">
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
        </div>

        <div className="flex flex-col gap-2">
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
        </div>

        <div className="flex flex-col gap-2">
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
        </div>

        <div className="flex flex-col gap-2">
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
        </div>

        {status.kind === 'exported' && (
          <p className="text-sm text-muted-foreground">
            {t.export.exportedSummary(
              t.export.summary(status.goals, status.entries),
            )}
          </p>
        )}
        {status.kind === 'exportedRangedBackup' && (
          <p className="text-sm text-muted-foreground">
            {t.export.exportedSummary(
              t.export.summary(status.goals, status.entries),
            )}
          </p>
        )}
        {status.kind === 'exportedExcel' && (
          <p className="text-sm text-muted-foreground">
            {t.export.exportedSummary(
              t.export.summary(status.goals, status.entries),
            )}
          </p>
        )}
        {status.kind === 'exportedCsv' && (
          <p className="text-sm text-muted-foreground">
            {t.export.exportedCsvSummary(status.entries)}
          </p>
        )}
        {status.kind === 'exportedMarkdown' && (
          <p className="text-sm text-muted-foreground">
            {t.export.exportedMarkdownSummary(status.entries)}
          </p>
        )}
        {status.kind === 'imported' && (
          <p className="text-sm text-muted-foreground">
            {t.export.importedSummary(
              t.export.summary(status.goals, status.entries),
            )}
          </p>
        )}
        {status.kind === 'importedZeppLife' && (
          <p className="text-sm text-muted-foreground">
            {status.daysImported === 0
              ? t.zeppLifeImport.importedNothingSummary
              : t.zeppLifeImport.importedSummary(
                  status.daysImported,
                  status.daysUpdated,
                )}
          </p>
        )}
        {status.kind === 'importedAppleHealth' && (
          <p className="text-sm text-muted-foreground">
            {status.daysImported === 0
              ? t.appleHealthImport.importedNothingSummary
              : t.appleHealthImport.importedSummary(
                  status.daysImported,
                  status.daysUpdated,
                )}
          </p>
        )}
        {status.kind === 'importedMyFitnessPal' && (
          <p className="text-sm text-muted-foreground">
            {status.daysImported === 0
              ? t.myFitnessPalImport.importedNothingSummary
              : t.myFitnessPalImport.importedSummary(
                  status.daysImported,
                  status.daysUpdated,
                )}
          </p>
        )}
        {status.kind === 'error' && (
          <p className="text-sm text-destructive">{status.message}</p>
        )}
      </CardContent>
      <ZeppLifePasswordDialog
        open={zeppLifeDialogOpen}
        onOpenChange={(open) => {
          setZeppLifeDialogOpen(open)
          if (!open) {
            setZeppLifePendingFile(null)
            setZeppLifePasswordError(null)
          }
        }}
        onSubmit={handleZeppLifePasswordSubmit}
        error={zeppLifePasswordError}
        submitting={status.kind === 'importingZeppLife'}
      />
    </>
  )
}
