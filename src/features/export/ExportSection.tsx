import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import {
  exportAllData,
  importAllData,
  InvalidBackupFileError,
  parseExportBundle,
} from './exportActions'

type Status =
  | { kind: 'idle' }
  | { kind: 'exporting' }
  | { kind: 'exported'; goals: number; entries: number }
  | { kind: 'importing' }
  | { kind: 'imported'; goals: number; entries: number }
  | { kind: 'error'; message: string }

export function ExportSection() {
  const t = useTranslation()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    <div className="flex flex-col gap-4 border-t border-border pt-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">
          {t.export.title}
        </h2>
        <p className="text-sm text-muted-foreground">{t.export.description}</p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{t.export.exportBlurb}</p>
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
        <p className="text-sm text-muted-foreground">{t.export.importBlurb}</p>
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
    </div>
  )
}
