import { useRef, useState } from 'react'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { ImportConflictModePicker } from './ImportConflictModePicker'
import { ImportFieldPicker } from './ImportFieldPicker'
import {
  assertImportFileWithinSizeLimit,
  ImportFileTooLargeError,
} from './importFileSize'
import type { DailyEntryImportMode, DailyEntryPatch } from './mergeDailyEntryPatches'
import { SectionStatus } from './SectionStatus'
import { APPLE_HEALTH_FIELDS } from './thirdPartyImportFields'
import {
  AppleHealthInvalidFileError,
  importAppleHealthExport,
} from './appleHealth/importAppleHealth'

type Status =
  | { kind: 'idle' }
  | { kind: 'importing'; progress: number }
  | { kind: 'imported'; daysImported: number; daysUpdated: number }
  | { kind: 'error'; message: string }

export function AppleHealthImportPanel() {
  const t = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    () => new Set(APPLE_HEALTH_FIELDS.map((field) => field.key)),
  )
  const [importMode, setImportMode] =
    useState<DailyEntryImportMode>('fillGaps')

  async function handleFileSelected(file: File) {
    setStatus({ kind: 'importing', progress: 0 })
    try {
      assertImportFileWithinSizeLimit(file)
      const { daysImported, daysUpdated } = await importAppleHealthExport(
        file,
        (fraction) => {
          setStatus({
            kind: 'importing',
            progress: Math.round(fraction * 100),
          })
        },
        selectedFields as ReadonlySet<keyof DailyEntryPatch>,
        importMode,
      )
      setStatus({ kind: 'imported', daysImported, daysUpdated })
    } catch (err) {
      setStatus({
        kind: 'error',
        message:
          err instanceof ImportFileTooLargeError
            ? t.export.fileTooLarge
            : err instanceof AppleHealthInvalidFileError
              ? t.appleHealthImport.invalidFile
              : t.appleHealthImport.importFailed,
      })
    }
  }

  return (
    <div className="flex flex-col gap-2 section-shell p-3">
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
        <span className="text-sm font-medium">{t.export.dataToImportLabel}</span>
        <ImportFieldPicker
          ariaLabel={`${t.appleHealthImport.importButton} — ${t.export.dataToImportLabel}`}
          fields={APPLE_HEALTH_FIELDS.map((field) => ({
            key: field.key,
            label: field.label(t),
          }))}
          selected={selectedFields}
          onChange={setSelectedFields}
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
          value={importMode}
          onChange={setImportMode}
          fillGapsLabel={t.export.importConflictModeFillGaps}
          overwriteLabel={t.export.importConflictModeOverwrite}
        />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFileSelected(file)
          e.target.value = ''
        }}
      />
      <Button
        variant="outline"
        className="self-start"
        onClick={() => fileInputRef.current?.click()}
        disabled={status.kind === 'importing' || selectedFields.size === 0}
      >
        {status.kind === 'importing'
          ? t.appleHealthImport.importingButton(status.progress)
          : t.appleHealthImport.importButton}
      </Button>
      {status.kind === 'imported' && (
        <SectionStatus>
          {status.daysImported === 0
            ? t.appleHealthImport.importedNothingSummary
            : t.appleHealthImport.importedSummary(
                status.daysImported,
                status.daysUpdated,
              )}
        </SectionStatus>
      )}
      {status.kind === 'error' && (
        <SectionStatus error>{status.message}</SectionStatus>
      )}
    </div>
  )
}
