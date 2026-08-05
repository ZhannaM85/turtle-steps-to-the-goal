import { useState } from 'react'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

export interface EncryptedBackupImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (password: string) => void
  /** Wrong-password error from a previous attempt — same shape as
   * {@link MyFitnessPalPasswordDialog}'s own `error` prop. */
  error: string | null
  submitting: boolean
}

/**
 * Password prompt for an encrypted JSON backup (#608) — opens once
 * `handleImportFile` detects the picked file is an
 * `EncryptedBackupEnvelope` rather than a plain export bundle. Same
 * shape as {@link MyFitnessPalPasswordDialog}/`ZeppLifePasswordDialog`.
 * The password only ever lives in this dialog's own local state for the
 * one `onSubmit` call.
 */
export function EncryptedBackupImportDialog({
  open,
  onOpenChange,
  onSubmit,
  error,
  submitting,
}: EncryptedBackupImportDialogProps) {
  const t = useTranslation()
  const [password, setPassword] = useState('')

  function handleSubmit() {
    if (!password || submitting) return
    onSubmit(password)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPassword('')
        onOpenChange(next)
      }}
    >
      <DialogContent closeLabel={t.export.closeEncryptedDialogLabel}>
        <DialogTitle>{t.export.encryptedImportDialogTitle}</DialogTitle>
        <DialogDescription>
          {t.export.encryptedImportDialogDescription}
        </DialogDescription>
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="encrypted-import-password">
              {t.export.encryptedBackupPasswordLabel}
            </Label>
            <Input
              id="encrypted-import-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              disabled={submitting}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !password}
            className="self-start"
          >
            {submitting
              ? t.export.decryptingBackupButton
              : t.export.encryptedImportSubmitButton}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
