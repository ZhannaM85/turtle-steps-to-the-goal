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
import { ZEPP_LIFE_FIELDS } from './thirdPartyImportFields'
import {
  importZeppLifeExport,
  ZeppLifeInvalidFileError,
  ZeppLifeMultipleProfilesError,
  ZeppLifeWrongPasswordError,
} from './zeppLife/importZeppLife'
import { ZeppLifePasswordDialog } from './zeppLife/ZeppLifePasswordDialog'
import { ZeppLifeProfileDialog } from './zeppLife/ZeppLifeProfileDialog'
import type { ZeppBodyProfile } from './zeppLife/zeppLifeParser'

type Status =
  | { kind: 'idle' }
  | { kind: 'importing' }
  | { kind: 'imported'; daysImported: number; daysUpdated: number }
  | { kind: 'error'; message: string }

export function ZeppLifeImportPanel() {
  const t = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const advancingRef = useRef(false)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPassword, setPendingPassword] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [profiles, setProfiles] = useState<ZeppBodyProfile[]>([])
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    () => new Set(ZEPP_LIFE_FIELDS.map((field) => field.key)),
  )
  const [importMode, setImportMode] =
    useState<DailyEntryImportMode>('fillGaps')

  function clearFlow() {
    setPendingFile(null)
    setPendingPassword(null)
    setPasswordError(null)
    setProfiles([])
  }

  function handleFileSelected(file: File) {
    try {
      assertImportFileWithinSizeLimit(file)
    } catch (err) {
      if (err instanceof ImportFileTooLargeError) {
        setStatus({ kind: 'error', message: t.export.fileTooLarge })
        return
      }
      throw err
    }
    setPendingFile(file)
    setPendingPassword(null)
    setPasswordError(null)
    setProfiles([])
    setDialogOpen(true)
  }

  async function runImport(password: string, selectedHeightCm?: number) {
    if (!pendingFile) return
    setStatus({ kind: 'importing' })
    try {
      const { daysImported, daysUpdated } = await importZeppLifeExport(
        pendingFile,
        password,
        selectedFields as ReadonlySet<keyof DailyEntryPatch>,
        importMode,
        selectedHeightCm,
      )
      setDialogOpen(false)
      setProfileDialogOpen(false)
      clearFlow()
      setStatus({ kind: 'imported', daysImported, daysUpdated })
    } catch (err) {
      if (err instanceof ZeppLifeWrongPasswordError) {
        setPasswordError(t.zeppLifeImport.wrongPassword)
        setStatus({ kind: 'idle' })
        return
      }
      if (err instanceof ZeppLifeMultipleProfilesError) {
        setPendingPassword(password)
        setProfiles(err.profiles)
        advancingRef.current = true
        setDialogOpen(false)
        setProfileDialogOpen(true)
        advancingRef.current = false
        setStatus({ kind: 'idle' })
        return
      }
      setDialogOpen(false)
      setProfileDialogOpen(false)
      clearFlow()
      setStatus({
        kind: 'error',
        message:
          err instanceof ZeppLifeInvalidFileError
            ? t.zeppLifeImport.invalidFile
            : t.zeppLifeImport.importFailed,
      })
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 section-shell p-3">
        <p className="text-sm text-muted-foreground">
          {t.zeppLifeImport.importBlurb}
        </p>
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
            ariaLabel={`${t.zeppLifeImport.importButton} — ${t.export.importConflictModeLabel}`}
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
            if (file) handleFileSelected(file)
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
            ? t.zeppLifeImport.importingButton
            : t.zeppLifeImport.importButton}
        </Button>
        {status.kind === 'imported' && (
          <SectionStatus>
            {status.daysImported === 0
              ? t.zeppLifeImport.importedNothingSummary
              : t.zeppLifeImport.importedSummary(
                  status.daysImported,
                  status.daysUpdated,
                )}
          </SectionStatus>
        )}
        {status.kind === 'error' && (
          <SectionStatus error>{status.message}</SectionStatus>
        )}
      </div>
      <ZeppLifePasswordDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open && !advancingRef.current) clearFlow()
        }}
        onSubmit={(password) => void runImport(password)}
        error={passwordError}
        submitting={status.kind === 'importing'}
      />
      <ZeppLifeProfileDialog
        open={profileDialogOpen}
        onOpenChange={(open) => {
          setProfileDialogOpen(open)
          if (!open) clearFlow()
        }}
        profiles={profiles}
        onSubmit={(heightCm) => {
          if (!pendingPassword) return
          void runImport(pendingPassword, heightCm)
        }}
        submitting={status.kind === 'importing'}
      />
    </>
  )
}
