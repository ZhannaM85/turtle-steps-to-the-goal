import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
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

function summaryText(goals: number, entries: number): string {
  const goalLabel = `${goals} goal${goals === 1 ? '' : 's'}`
  const entryLabel = `${entries} daily ${entries === 1 ? 'entry' : 'entries'}`
  return `${goalLabel} and ${entryLabel}`
}

export function ExportScreen() {
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
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Export failed.',
      })
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
          ? err.message
          : err instanceof SyntaxError
            ? "That file isn't valid JSON."
            : err instanceof Error
              ? err.message
              : 'Import failed.'
      setStatus({ kind: 'error', message })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Export" description="Export/import a JSON backup" />

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Download every goal and daily entry as a single JSON file. This is the
          only backup for your data, since everything is stored locally on this
          device.
        </p>
        <Button
          onClick={handleExport}
          className="self-start"
          disabled={status.kind === 'exporting'}
        >
          {status.kind === 'exporting' ? 'Exporting…' : 'Export backup'}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Restore from a previously exported file. This merges into your
          existing data (matching entries are updated by date; nothing is
          deleted).
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
          {status.kind === 'importing' ? 'Importing…' : 'Import backup'}
        </Button>
      </div>

      {status.kind === 'exported' && (
        <p className="text-sm text-muted-foreground">
          Exported {summaryText(status.goals, status.entries)}.
        </p>
      )}
      {status.kind === 'imported' && (
        <p className="text-sm text-muted-foreground">
          Imported {summaryText(status.goals, status.entries)}.
        </p>
      )}
      {status.kind === 'error' && (
        <p className="text-sm text-destructive">{status.message}</p>
      )}
    </div>
  )
}
