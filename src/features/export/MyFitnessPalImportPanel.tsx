import { useRef, useState } from 'react'
import { useTranslation } from '@/i18n'
import { type MealSlotDefaultTimes } from '@/shared/lib/mealLabel'
import { useMealSlotDefaultTimesStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { ImportConflictModePicker } from './ImportConflictModePicker'
import { ImportFieldPicker } from './ImportFieldPicker'
import {
  assertImportFileWithinSizeLimit,
  ImportFileTooLargeError,
} from './importFileSize'
import type { DailyEntryImportMode, DailyEntryPatch } from './mergeDailyEntryPatches'
import { SectionStatus } from './SectionStatus'
import { MYFITNESSPAL_FIELDS } from './thirdPartyImportFields'
import {
  importMyFitnessPalExport,
  isMyFitnessPalEncrypted,
  MyFitnessPalInvalidFileError,
  MyFitnessPalWrongPasswordError,
} from './myFitnessPal/importMyFitnessPal'
import { MyFitnessPalPasswordDialog } from './myFitnessPal/MyFitnessPalPasswordDialog'
import { MyFitnessPalSlotTimesDialog } from './myFitnessPal/MyFitnessPalSlotTimesDialog'

type Status =
  | { kind: 'idle' }
  | { kind: 'importing' }
  | { kind: 'imported'; daysImported: number; daysUpdated: number }
  | { kind: 'error'; message: string }

export function MyFitnessPalImportPanel() {
  const t = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const advancingRef = useRef(false)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingSlotTimes, setPendingSlotTimes] =
    useState<MealSlotDefaultTimes | null>(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [slotTimesDialogOpen, setSlotTimesDialogOpen] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const mealSlotDefaultTimes = useMealSlotDefaultTimesStore(
    (state) => state.times,
  )
  const setMealSlotDefaultTimes = useMealSlotDefaultTimesStore(
    (state) => state.setTimes,
  )
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    () => new Set(MYFITNESSPAL_FIELDS.map((field) => field.key)),
  )
  const [importMode, setImportMode] =
    useState<DailyEntryImportMode>('fillGaps')

  function clearFlow() {
    setPendingFile(null)
    setPendingSlotTimes(null)
    setNeedsPassword(false)
    setPasswordError(null)
  }

  async function handleFileSelected(file: File) {
    try {
      assertImportFileWithinSizeLimit(file)
      const buffer = await file.arrayBuffer()
      const encrypted = isMyFitnessPalEncrypted(buffer)
      setPendingFile(file)
      setPasswordError(null)
      setNeedsPassword(encrypted)
      setSlotTimesDialogOpen(true)
    } catch (err) {
      setStatus({
        kind: 'error',
        message:
          err instanceof ImportFileTooLargeError
            ? t.export.fileTooLarge
            : t.myFitnessPalImport.invalidFile,
      })
    }
  }

  function handleSlotTimesConfirm(times: MealSlotDefaultTimes) {
    setMealSlotDefaultTimes(times)
    setPendingSlotTimes(times)
    if (needsPassword) {
      advancingRef.current = true
      setSlotTimesDialogOpen(false)
      setDialogOpen(true)
      advancingRef.current = false
      return
    }
    setSlotTimesDialogOpen(false)
    if (!pendingFile) return
    void runImport(pendingFile, undefined, times)
  }

  async function runImport(
    file: File,
    password?: string,
    slotTimes: MealSlotDefaultTimes = mealSlotDefaultTimes,
  ) {
    setStatus({ kind: 'importing' })
    try {
      const { daysImported, daysUpdated } = await importMyFitnessPalExport(
        file,
        selectedFields as ReadonlySet<keyof DailyEntryPatch>,
        importMode,
        password,
        slotTimes,
      )
      setDialogOpen(false)
      setSlotTimesDialogOpen(false)
      clearFlow()
      setStatus({ kind: 'imported', daysImported, daysUpdated })
    } catch (err) {
      if (err instanceof MyFitnessPalWrongPasswordError) {
        setPasswordError(t.myFitnessPalImport.wrongPassword)
        setDialogOpen(true)
        setStatus({ kind: 'idle' })
        return
      }
      setDialogOpen(false)
      setSlotTimesDialogOpen(false)
      clearFlow()
      setStatus({
        kind: 'error',
        message:
          err instanceof MyFitnessPalInvalidFileError
            ? t.myFitnessPalImport.invalidFile
            : t.myFitnessPalImport.importFailed,
      })
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 section-shell p-3">
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
            ariaLabel={`${t.myFitnessPalImport.importButton} — ${t.export.importConflictModeLabel}`}
            value={importMode}
            onChange={setImportMode}
            fillGapsLabel={t.export.importConflictModeFillGaps}
            overwriteLabel={t.export.importConflictModeOverwrite}
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
            ? t.myFitnessPalImport.importingButton
            : t.myFitnessPalImport.importButton}
        </Button>
        {status.kind === 'imported' && (
          <SectionStatus>
            {status.daysImported === 0
              ? t.myFitnessPalImport.importedNothingSummary
              : t.myFitnessPalImport.importedSummary(
                  status.daysImported,
                  status.daysUpdated,
                )}
          </SectionStatus>
        )}
        {status.kind === 'error' && (
          <SectionStatus error>{status.message}</SectionStatus>
        )}
      </div>
      <MyFitnessPalSlotTimesDialog
        open={slotTimesDialogOpen}
        onOpenChange={(open) => {
          setSlotTimesDialogOpen(open)
          if (!open && !advancingRef.current) clearFlow()
        }}
        initialTimes={mealSlotDefaultTimes}
        onConfirm={handleSlotTimesConfirm}
        needsPasswordNext={needsPassword}
        submitting={status.kind === 'importing'}
      />
      <MyFitnessPalPasswordDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) clearFlow()
        }}
        onSubmit={(password) => {
          if (!pendingFile) return
          void runImport(
            pendingFile,
            password,
            pendingSlotTimes ?? mealSlotDefaultTimes,
          )
        }}
        error={passwordError}
        submitting={status.kind === 'importing'}
      />
    </>
  )
}
