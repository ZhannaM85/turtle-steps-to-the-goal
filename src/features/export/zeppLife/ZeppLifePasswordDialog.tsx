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

export interface ZeppLifePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (password: string) => void
  /** Wrong-password error from a previous attempt — kept as its own prop
   * rather than folded into `ExportSection`'s single `status` state, since
   * it needs to render inline inside this still-open dialog rather than
   * replacing the whole card's content. */
  error: string | null
  submitting: boolean
}

/** Password prompt for a Zepp Life export zip (#365) — always AES-encrypted,
 * so this dialog opens immediately after the file is picked, before any
 * parsing happens. The password is only ever held in this component's own
 * state for the one `onSubmit` call; nothing here persists it. */
export function ZeppLifePasswordDialog({
  open,
  onOpenChange,
  onSubmit,
  error,
  submitting,
}: ZeppLifePasswordDialogProps) {
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
      <DialogContent closeLabel={t.zeppLifeImport.closeDialogLabel}>
        <DialogTitle>{t.zeppLifeImport.passwordDialogTitle}</DialogTitle>
        <DialogDescription>
          {t.zeppLifeImport.passwordDialogDescription}
        </DialogDescription>
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zepp-life-password">
              {t.zeppLifeImport.passwordLabel}
            </Label>
            <Input
              id="zepp-life-password"
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
              ? t.zeppLifeImport.importingButton
              : t.zeppLifeImport.passwordSubmitButton}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
