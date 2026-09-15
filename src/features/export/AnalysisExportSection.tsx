import { type ReactNode, useState } from 'react'
import { useTranslation } from '@/i18n'
import {
  useEatingReasonTrackingStore,
  useMealSlotDefaultTimesStore,
  useProfileStore,
} from '@/stores'
import { Button } from '@/shared/ui/button'
import { DateInput } from '@/shared/ui/date-input'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
import { currentAnalysisExportTracking } from './analysisExportTracking'
import { exportAllData } from './exportActions'
import { buildDailyLogCsv, CSV_BOM } from './exportCsv'
import {
  resolveExportFileStem,
  type ExportRangePreset,
} from './exportPeriodFileStamp'
import { buildDailyLogMarkdown } from './exportMarkdown'
import { buildExportWorkbook } from './exportXlsx'
import { filterByExportPeriod } from './filterByExportPeriod'
import { PdfExportSection } from './PdfExportSection'
import { sectionErrorMessage } from './exportSectionStatus'
import { SectionStatus } from './SectionStatus'
import { useExportPeriod } from './useExportPeriod'

type StatusSection = 'rangedBackup' | 'excel' | 'csv' | 'markdown'

type Status =
  | { kind: 'idle' }
  | { kind: 'exportingRangedBackup' }
  | { kind: 'exportedRangedBackup'; goals: number; entries: number }
  | { kind: 'exportingExcel' }
  | { kind: 'exportedExcel'; goals: number; entries: number }
  | { kind: 'exportingCsv' }
  | { kind: 'exportedCsv'; entries: number }
  | { kind: 'exportingMarkdown' }
  | { kind: 'exportedMarkdown'; entries: number }
  | { kind: 'error'; section: StatusSection; message: string }

/** #868 — period picker, ranged JSON, Excel/CSV/Markdown, then PDF.
 * `children` keeps Encrypted backup between ranged JSON and Excel. */
export function AnalysisExportSection({ children }: { children?: ReactNode }) {
  const t = useTranslation()
  const sex = useProfileStore((state) => state.sex)
  const eatingReasonLabelOverrides = useEatingReasonTrackingStore(
    (state) => state.builtinLabelOverrides,
  )
  const mealSlotDefaultTimes = useMealSlotDefaultTimesStore(
    (state) => state.times,
  )
  const {
    periodStart,
    periodEnd,
    rangePreset,
    fileStem,
    setFileStem,
    setPeriodRange,
    applyRangePreset,
  } = useExportPeriod()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

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
          tracking: currentAnalysisExportTracking(),
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
        tracking: currentAnalysisExportTracking(),
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
        tracking: currentAnalysisExportTracking(),
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

  return (
    <>
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
          <DateInput
            aria-label={`${t.export.exportPeriodLabel} — ${t.dashboard.rangeStartLabel}`}
            value={periodStart}
            max={periodEnd || undefined}
            onChange={(e) =>
              setPeriodRange(e.target.value, periodEnd, 'custom')
            }
            className="h-12"
          />
          <DateInput
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

      {children}

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

      <PdfExportSection />
    </>
  )
}
