import { useState } from 'react'
import type { Sex } from '@/domain/stats'
import { useTranslation } from '@/i18n'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { useProfileStore } from '@/stores'
import { ageSchema, heightCmSchema } from './profileFormSchema'

// #233 — Height/Age/Sex, entered once (or rarely updated) purely to
// compute BMI/BMR on Today, not a daily entry. Same "bundle related
// fields under one Save button" shape as Body measurements/composition on
// the daily log form, but plain local state instead of React Hook Form —
// this is a single always-editable Settings card, not a display/edit
// toggle over saved history.
export function ProfileSection() {
  const t = useTranslation()
  const heightCm = useProfileStore((state) => state.heightCm)
  const age = useProfileStore((state) => state.age)
  const sex = useProfileStore((state) => state.sex)
  const setHeightCm = useProfileStore((state) => state.setHeightCm)
  const setAge = useProfileStore((state) => state.setAge)
  const setSex = useProfileStore((state) => state.setSex)

  const [heightInput, setHeightInput] = useState(heightCm?.toString() ?? '')
  const [ageInput, setAgeInput] = useState(age?.toString() ?? '')
  const [pendingSex, setPendingSex] = useState<Sex | undefined>(sex)
  const [error, setError] = useState<string | null>(null)

  function save() {
    const heightResult = heightCmSchema.safeParse(
      parseNumberInput(heightInput),
    )
    const ageResult = ageSchema.safeParse(parseNumberInput(ageInput))
    if (!heightResult.success || !ageResult.success) {
      setError(
        heightResult.success
          ? (ageResult.error?.issues[0]?.message ?? null)
          : (heightResult.error?.issues[0]?.message ?? null),
      )
      return
    }
    setError(null)
    setHeightCm(heightResult.data)
    setAge(ageResult.data)
    setSex(pendingSex)
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t.settings.profileDescription}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {t.settings.heightLabel}
          </span>
          <Input
            type="text"
            inputMode="decimal"
            aria-label={t.settings.heightLabel}
            aria-invalid={error ? true : undefined}
            className="h-12 w-20"
            value={heightInput}
            onChange={(e) => setHeightInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                save()
              }
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {t.settings.ageLabel}
          </span>
          <Input
            type="text"
            inputMode="numeric"
            aria-label={t.settings.ageLabel}
            aria-invalid={error ? true : undefined}
            className="h-12 w-16"
            value={ageInput}
            onChange={(e) => setAgeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                save()
              }
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {t.settings.sexLabel}
          </span>
          <ToggleGroup
            type="single"
            aria-label={t.settings.sexLabel}
            value={pendingSex ?? ''}
            onValueChange={(value) => value && setPendingSex(value as Sex)}
          >
            <ToggleGroupItem value="female" className="h-12">
              {t.settings.sexFemaleOption}
            </ToggleGroupItem>
            <ToggleGroupItem value="male" className="h-12">
              {t.settings.sexMaleOption}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={save}>
          {t.settings.saveProfileLabel}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
