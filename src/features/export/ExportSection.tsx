import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
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

type Status =
  | { kind: 'idle' }
  | { kind: 'exporting' }
  | { kind: 'exported'; goals: number; entries: number }
  | { kind: 'exportingExcel' }
  | { kind: 'exportedExcel'; goals: number; entries: number }
  | { kind: 'exportingCsv' }
  | { kind: 'exportedCsv'; entries: number }
  | { kind: 'exportingMarkdown' }
  | { kind: 'exportedMarkdown'; entries: number }
  | { kind: 'importing' }
  | { kind: 'imported'; goals: number; entries: number }
  | { kind: 'error'; message: string }

/** "50 KB" / "1.2 MB" / "1.2 GB" — used for both usage and quota (#191:
 * quota is now shown alongside usage, so this needs a GB tier it never
 * used to reach). */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function ExportSection() {
  const t = useTranslation()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [storageUsage, setStorageUsage] = useState<number | null>(null)
  const [storageQuota, setStorageQuota] = useState<number | null>(null)

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

  // Distinct from handleExport (#123) — this is a human-readable view for
  // browsing/analysis, not a re-importable backup, so it's kept as a
  // separate action rather than a format option on the same button.
  async function handleExportExcel() {
    setStatus({ kind: 'exportingExcel' })
    try {
      const bundle = await exportAllData()
      const workbook = await buildExportWorkbook(
        bundle.goals,
        bundle.dailyEntries,
        t,
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
        entries: bundle.dailyEntries.length,
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
      const csv = buildDailyLogCsv(bundle.dailyEntries, t)
      const blob = new Blob([CSV_BOM, csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `turtle-steps-daily-log-${format(new Date(), 'yyyy-MM-dd')}.csv`
      link.click()
      URL.revokeObjectURL(url)
      setStatus({ kind: 'exportedCsv', entries: bundle.dailyEntries.length })
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
      const markdown = buildDailyLogMarkdown(bundle.dailyEntries, t)
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `turtle-steps-daily-log-${format(new Date(), 'yyyy-MM-dd')}.md`
      link.click()
      URL.revokeObjectURL(url)
      setStatus({
        kind: 'exportedMarkdown',
        entries: bundle.dailyEntries.length,
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

        {status.kind === 'exported' && (
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
        {status.kind === 'error' && (
          <p className="text-sm text-destructive">{status.message}</p>
        )}
      </CardContent>
    </>
  )
}
