import { useState } from 'react'
import { Pencil } from 'lucide-react'
import type { ActivityLevel, Sex } from '@/domain/stats'
import {
  formatExactNumber,
  formatNumber,
  useLocale,
  useTranslation,
  type Dictionary,
} from '@/i18n'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { useProfileStore } from '@/stores'
import { ageSchema, heightCmSchema } from './profileFormSchema'

function activityLevelOptions(
  t: Dictionary,
): { value: ActivityLevel; label: string }[] {
  return [
    { value: 'sedentary', label: t.settings.activityLevelSedentary },
    { value: 'light', label: t.settings.activityLevelLight },
    { value: 'moderate', label: t.settings.activityLevelModerate },
    { value: 'active', label: t.settings.activityLevelActive },
    { value: 'veryActive', label: t.settings.activityLevelVeryActive },
  ]
}

// #233 — Height/Age/Sex, entered once (or rarely updated) purely to
// compute BMI/BMR on Today, not a daily entry. Same "bundle related
// fields under one Save button" shape as Body measurements/composition on
// the daily log form, but plain local state instead of React Hook Form —
// this is a single always-editable Settings card, not a display/edit
// toggle over saved history.
export function ProfileSection() {
  const t = useTranslation()
  const locale = useLocale()
  const heightCm = useProfileStore((state) => state.heightCm)
  const age = useProfileStore((state) => state.age)
  const sex = useProfileStore((state) => state.sex)
  const activityLevel = useProfileStore((state) => state.activityLevel)
  const setHeightCm = useProfileStore((state) => state.setHeightCm)
  const setAge = useProfileStore((state) => state.setAge)
  const setSex = useProfileStore((state) => state.setSex)
  const setActivityLevel = useProfileStore((state) => state.setActivityLevel)

  const [heightInput, setHeightInput] = useState(heightCm?.toString() ?? '')
  const [ageInput, setAgeInput] = useState(age?.toString() ?? '')
  const [pendingSex, setPendingSex] = useState<Sex | undefined>(sex)
  const [pendingActivityLevel, setPendingActivityLevel] = useState<
    ActivityLevel | undefined
  >(activityLevel)
  const [error, setError] = useState<string | null>(null)
  // #265: read-only display + pencil-to-edit, same shape as the daily-entry
  // form's Weight/Body composition fields — the only "did it save"
  // feedback was the values silently persisting with the form left exactly
  // as-is, which read as the button doing nothing. Starts editable only
  // when nothing's been saved yet; a pencil click re-opens it, a
  // successful save collapses it back.
  const [isEditingProfile, setIsEditingProfile] = useState(
    heightCm === undefined &&
      age === undefined &&
      sex === undefined &&
      activityLevel === undefined,
  )

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
    setActivityLevel(pendingActivityLevel)
    setIsEditingProfile(false)
  }

  if (!isEditingProfile) {
    const activityLevelLabel =
      activityLevelOptions(t).find((option) => option.value === activityLevel)
        ?.label ?? '—'
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {t.settings.profileDescription}
        </p>
        <div className="flex h-12 items-center justify-between rounded-lg bg-muted px-3">
          <span className="text-sm text-foreground">
            {t.settings.profileSummary(
              heightCm === undefined
                ? '—'
                : `${formatExactNumber(heightCm, locale)}${t.dailyEntry.cmUnit}`,
              age === undefined ? '—' : formatNumber(age, locale, 0),
              sex === 'female'
                ? t.settings.sexFemaleOption
                : sex === 'male'
                  ? t.settings.sexMaleOption
                  : '—',
              activityLevelLabel,
            )}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xl"
            aria-label={t.settings.editProfileLabel}
            onClick={() => setIsEditingProfile(true)}
          >
            <Pencil aria-hidden="true" />
          </Button>
        </div>
      </div>
    )
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
      </div>
      {/* #259 — only used by GoalForm's "Suggest a target" TDEE helper,
       * unrelated to the BMI/BMR stats the fields above power. Its own row
       * since 5 options wouldn't fit inline with the rest on mobile. */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">
          {t.settings.activityLevelLabel}
        </span>
        <ToggleGroup
          type="single"
          aria-label={t.settings.activityLevelLabel}
          value={pendingActivityLevel ?? ''}
          onValueChange={(value) =>
            value && setPendingActivityLevel(value as ActivityLevel)
          }
          className="flex-wrap"
        >
          {activityLevelOptions(t).map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className="h-12"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={save}
        className="self-start"
      >
        {t.settings.saveProfileLabel}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
