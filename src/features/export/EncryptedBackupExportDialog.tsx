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

export interface EncryptedBackupExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (password: string) => void
  submitting: boolean
}

/**
 * Sets a password for a new encrypted backup (#608) — distinct from
 * {@link EncryptedBackupImportDialog}, which enters an *existing* one.
 * Requires the password typed twice (no confirmation email/SMS exists in
 * a local-only app to recover a typo). Warns explicitly that a forgotten
 * password makes the file unrecoverable — this app has no way to reset
 * or bypass it, by design of the underlying AES-GCM + PBKDF2 encryption.
 * The password itself is only ever held in this dialog's own local state
 * for the one `onSubmit` call.
 */
export function EncryptedBackupExportDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: EncryptedBackupExportDialogProps) {
  const t = useTranslation()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const mismatch =
    confirmPassword.length > 0 && password !== confirmPassword
  const canSubmit = password.length > 0 && password === confirmPassword

  function handleSubmit() {
    if (!canSubmit || submitting) return
    onSubmit(password)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPassword('')
          setConfirmPassword('')
        }
        onOpenChange(next)
      }}
    >
      <DialogContent closeLabel={t.export.closeEncryptedDialogLabel}>
        <DialogTitle>{t.export.encryptedExportDialogTitle}</DialogTitle>
        <DialogDescription>
          {t.export.encryptedExportDialogDescription}
        </DialogDescription>
        <div className="flex flex-col gap-4 pt-4">
          <p className="text-sm text-destructive">
            {t.export.encryptedBackupUnrecoverableWarning}
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="encrypted-export-password">
              {t.export.encryptedBackupPasswordLabel}
            </Label>
            <Input
              id="encrypted-export-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="encrypted-export-password-confirm">
              {t.export.encryptedBackupConfirmPasswordLabel}
            </Label>
            <Input
              id="encrypted-export-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              disabled={submitting}
            />
            {mismatch && (
              <p className="text-sm text-destructive">
                {t.export.encryptedBackupPasswordMismatch}
              </p>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            className="self-start"
          >
            {submitting
              ? t.export.encryptingBackupButton
              : t.export.encryptedExportSubmitButton}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
