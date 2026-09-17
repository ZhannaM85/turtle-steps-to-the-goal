import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useTranslation } from '@/i18n'
import {
  useFoodOverrideStore,
  useLastBackupStore,
  useMealItemStore,
} from '@/stores'
import { Button } from '@/shared/ui/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { daysSince } from '@/shared/lib/lastBackupReminder'
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
import {
  assertImportFileWithinSizeLimit,
  ImportFileTooLargeError,
} from './importFileSize'
import { AnalysisExportSection } from './AnalysisExportSection'
import { sectionErrorMessage } from './exportSectionStatus'
import { SectionStatus } from './SectionStatus'
import { ThirdPartyImportSection } from './ThirdPartyImportSection'
import { StorageUsageBreakdown } from './StorageUsageBreakdown'
import {
  formatStorageBytes,
  readStorageBreakdown,
  type StorageBreakdown,
} from './storageBreakdown'

type StatusSection =
  | 'jsonBackup'
  | 'encryptedBackup'
  | 'jsonImport'
  | 'encryptedImport'

type Status =
  | { kind: 'idle' }
  | { kind: 'exporting' }
  | { kind: 'exported'; goals: number; entries: number }
  | { kind: 'exportingEncrypted' }
  | { kind: 'exportedEncrypted' }
  | { kind: 'importingEncrypted' }
  | { kind: 'importedEncrypted'; goals: number; entries: number }
  | { kind: 'importing' }
  | { kind: 'imported'; goals: number; entries: number }
  /** #617 — `section` keeps the alert under the matching export/import block. */
  | { kind: 'error'; section: StatusSection; message: string }

export function ExportSection() {
  const t = useTranslation()
  const recordBackupExport = useLastBackupStore((state) => state.recordExport)
  const lastExportedAt = useLastBackupStore((state) => state.lastExportedAt)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEncryptedExportDialogOpen, setIsEncryptedExportDialogOpen] =
    useState(false)
  const [pendingEncryptedEnvelope, setPendingEncryptedEnvelope] =
    useState<EncryptedBackupEnvelope | null>(null)
  const [encryptedImportError, setEncryptedImportError] = useState<
    string | null
  >(null)
  const [storageBreakdown, setStorageBreakdown] =
    useState<StorageBreakdown | null>(null)

  useEffect(() => {
    let active = true
    readStorageBreakdown()
      .then((breakdown) => {
        if (active) setStorageBreakdown(breakdown)
      })
      .catch(() => {})
    return () => { active = false }
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

  const encryptedBackupBlock = (
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
  )

  return (
    <>
      <CardHeader>
        <CardTitle>{t.export.title}</CardTitle>
        <CardDescription>{t.export.description}</CardDescription>
        {storageBreakdown !== null && (
          <p className="text-xs text-muted-foreground">
            {storageBreakdown.quota !== null
              ? t.export.storageUsedOfQuotaLabel(
                  formatStorageBytes(storageBreakdown.usage),
                  formatStorageBytes(storageBreakdown.quota),
                )
              : t.export.storageUsedLabel(formatStorageBytes(storageBreakdown.usage))}
          </p>
        )}
        {storageBreakdown !== null && (
          <StorageUsageBreakdown data={storageBreakdown} />
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

        <AnalysisExportSection>{encryptedBackupBlock}</AnalysisExportSection>

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
