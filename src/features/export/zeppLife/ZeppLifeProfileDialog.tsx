import { useState } from 'react'
import { useTranslation } from '@/i18n'
import type { ZeppBodyProfile } from './zeppLifeParser'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Label } from '@/shared/ui/label'

export interface ZeppLifeProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profiles: ZeppBodyProfile[]
  onSubmit: (heightCm: number) => void
  submitting: boolean
}

/** #616 — when a Zepp Life BODY CSV has more than one scale height (shared
 * household scale), ask which person's readings to import before writing. */
export function ZeppLifeProfileDialog({
  open,
  onOpenChange,
  profiles,
  onSubmit,
  submitting,
}: ZeppLifeProfileDialogProps) {
  const t = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.zeppLifeImport.closeDialogLabel}>
        <DialogTitle>{t.zeppLifeImport.profileDialogTitle}</DialogTitle>

        <DialogDescription>
          {t.zeppLifeImport.profileDialogDescription}
        </DialogDescription>
        {open ? (
          <ProfilePickerFields
            profiles={profiles}
            onSubmit={onSubmit}
            submitting={submitting}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ProfilePickerFields({
  profiles,
  onSubmit,
  submitting,
}: {
  profiles: ZeppBodyProfile[]
  onSubmit: (heightCm: number) => void
  submitting: boolean
}) {
  const t = useTranslation()
  const [selectedHeightCm, setSelectedHeightCm] = useState<number | null>(null)

  function handleSubmit() {
    if (selectedHeightCm === null || submitting) return
    onSubmit(selectedHeightCm)
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <fieldset className="flex flex-col gap-2" disabled={submitting}>
        <legend className="sr-only">
          {t.zeppLifeImport.profileDialogTitle}
        </legend>
        {profiles.map((profile) => {
          const id = `zepp-profile-${profile.heightCm}`
          const label = t.zeppLifeImport.profileOptionLabel({
            heightCm: profile.heightCm,
            minWeightKg: profile.minWeightKg,
            maxWeightKg: profile.maxWeightKg,
            readingCount: profile.readingCount,
            nickName: profile.nickName,
          })
          return (
            <Label
              key={profile.heightCm}
              htmlFor={id}
              className="flex cursor-pointer items-start gap-2 rounded-md border border-border px-3 py-2 font-normal"
            >
              <input
                id={id}
                type="radio"
                name="zepp-life-profile"
                className="mt-1"
                checked={selectedHeightCm === profile.heightCm}
                onChange={() => setSelectedHeightCm(profile.heightCm)}
              />
              <span>{label}</span>
            </Label>
          )
        })}
      </fieldset>
      <Button
        onClick={handleSubmit}
        disabled={submitting || selectedHeightCm === null}
        className="self-start"
      >
        {submitting
          ? t.zeppLifeImport.importingButton
          : t.zeppLifeImport.profileSubmitButton}
      </Button>
    </div>
  )
}
