import { useEffect, useState } from 'react'
import { useTranslation } from '@/i18n'
import {
  applyTrackingPreset,
  useAlcoholTrackingStore,
  useCycleTrackingStore,
  useDigestionTrackingStore,
  useEatingReasonTrackingStore,
  useCopyYesterdayMealsStore,
  useMealKcalVsYesterdayStore,
  useMicronutrientTrackingStore,
  usePlannedMealsTrackingStore,
  useProfileStore,
  useTrackedFieldsStore,
  useWaterTrackingStore,
  type MicronutrientField,
  type TrackedField,
  type TrackingPreset,
} from '@/stores'
import { Button } from '@/shared/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { CustomEatingReasonsEditor } from './CustomEatingReasonsEditor'
import { SettingsPinnableCard } from './SettingsPinnableCard'
import { TrackedFieldToggleRow } from './TrackedFieldToggleRow'

type UnifiedTrackedKey =
  | TrackedField
  | 'cycle'
  | 'constipation'
  | 'alcohol'
  | 'water'
  | 'plannedMeals'
  | 'eatingReason'
  | 'copyYesterdayMeals'
  | 'mealKcalVsYesterday'

export function SettingsTrackedFieldsSection() {
  const t = useTranslation()
  const cycleTrackingEnabled = useCycleTrackingStore((state) => state.enabled)
  const setCycleTrackingEnabled = useCycleTrackingStore(
    (state) => state.setEnabled,
  )
  const digestionTrackingEnabled = useDigestionTrackingStore(
    (state) => state.enabled,
  )
  const setDigestionTrackingEnabled = useDigestionTrackingStore(
    (state) => state.setEnabled,
  )
  const alcoholTrackingEnabled = useAlcoholTrackingStore(
    (state) => state.enabled,
  )
  const setAlcoholTrackingEnabled = useAlcoholTrackingStore(
    (state) => state.setEnabled,
  )
  const waterTrackingEnabled = useWaterTrackingStore((state) => state.enabled)
  const setWaterTrackingEnabled = useWaterTrackingStore(
    (state) => state.setEnabled,
  )
  const plannedMealsTrackingEnabled = usePlannedMealsTrackingStore(
    (state) => state.enabled,
  )
  const setPlannedMealsTrackingEnabled = usePlannedMealsTrackingStore(
    (state) => state.setEnabled,
  )
  const eatingReasonTrackingEnabled = useEatingReasonTrackingStore(
    (state) => state.enabled,
  )
  const setEatingReasonTrackingEnabled = useEatingReasonTrackingStore(
    (state) => state.setEnabled,
  )
  const copyYesterdayMealsEnabled = useCopyYesterdayMealsStore(
    (state) => state.enabled,
  )
  const setCopyYesterdayMealsEnabled = useCopyYesterdayMealsStore(
    (state) => state.setEnabled,
  )
  const mealKcalVsYesterdayEnabled = useMealKcalVsYesterdayStore(
    (state) => state.enabled,
  )
  const setMealKcalVsYesterdayEnabled = useMealKcalVsYesterdayStore(
    (state) => state.setEnabled,
  )
  const micronutrients = useMicronutrientTrackingStore((state) => state.tracked)
  const setMicronutrientTracked = useMicronutrientTrackingStore(
    (state) => state.setTracked,
  )
  const trackedFields = useTrackedFieldsStore((state) => state.tracked)
  const setTrackedField = useTrackedFieldsStore((state) => state.setTracked)
  const sex = useProfileStore((state) => state.sex)
  const morningTrackedKeys: UnifiedTrackedKey[] = [
    'sleep',
    'bodyMeasurements',
    'bodyComposition',
    'morningNote',
  ]
  const eveningTrackedKeys: UnifiedTrackedKey[] = [
    'steps',
    'note',
    'mood',
    'constipation',
    'alcohol',
    'nightEating',
  ]
  const otherTrackedKeys: UnifiedTrackedKey[] = [
    'cycle',
    'water',
    'dayTotals',
    'fiber',
    'plannedMeals',
    'copyYesterdayMeals',
    'mealKcalVsYesterday',
  ]

  function isFieldTracked(key: UnifiedTrackedKey): boolean {
    if (key === 'cycle') return cycleTrackingEnabled
    if (key === 'constipation') return digestionTrackingEnabled
    if (key === 'alcohol') return alcoholTrackingEnabled
    if (key === 'water') return waterTrackingEnabled
    if (key === 'plannedMeals') return plannedMealsTrackingEnabled
    if (key === 'eatingReason') return eatingReasonTrackingEnabled
    if (key === 'copyYesterdayMeals') return copyYesterdayMealsEnabled
    if (key === 'mealKcalVsYesterday') return mealKcalVsYesterdayEnabled
    return trackedFields[key]
  }

  function setFieldTracked(key: UnifiedTrackedKey, value: boolean) {
    if (key === 'cycle') setCycleTrackingEnabled(value)
    else if (key === 'constipation') setDigestionTrackingEnabled(value)
    else if (key === 'alcohol') setAlcoholTrackingEnabled(value)
    else if (key === 'water') setWaterTrackingEnabled(value)
    else if (key === 'plannedMeals') setPlannedMealsTrackingEnabled(value)
    else if (key === 'eatingReason') setEatingReasonTrackingEnabled(value)
    else if (key === 'copyYesterdayMeals') setCopyYesterdayMealsEnabled(value)
    else if (key === 'mealKcalVsYesterday') setMealKcalVsYesterdayEnabled(value)
    else setTrackedField(key, value)
  }

  function fieldCopy(key: UnifiedTrackedKey): {
    label: string
    description: string
  } {
    switch (key) {
      case 'sleep':
        return {
          label: t.dailyEntry.sleepLabel,
          description: t.settings.trackedFieldHintSleep,
        }
      case 'bodyMeasurements':
        return {
          label: t.dailyEntry.bodyMeasurementsLabel,
          description: t.settings.trackedFieldHintBodyMeasurements,
        }
      case 'bodyComposition':
        return {
          label: t.dailyEntry.bodyCompositionLabel,
          description: t.settings.trackedFieldHintBodyComposition,
        }
      case 'morningNote':
        return {
          label: t.dailyEntry.morningNoteLabel,
          description: t.settings.trackedFieldHintMorningNote,
        }
      case 'steps':
        return {
          label: t.dailyEntry.stepsLabel,
          description: t.settings.trackedFieldHintSteps,
        }
      case 'note':
        return {
          label: t.dailyEntry.noteLabel,
          description: t.settings.trackedFieldHintNote,
        }
      case 'mood':
        return {
          label: t.dailyEntry.dayMoodLabel,
          description: t.settings.trackedFieldHintMood,
        }
      case 'constipation':
        return {
          label: t.settings.digestionTrackingLabel,
          description: t.settings.trackedFieldHintDigestion,
        }
      case 'alcohol':
        return {
          label: t.settings.alcoholTrackingLabel,
          description: t.settings.trackedFieldHintAlcohol,
        }
      case 'nightEating':
        return {
          label: t.dailyEntry.nightEatingLabel(sex),
          description: t.settings.trackedFieldHintNightEating,
        }
      case 'cycle':
        return {
          label: t.settings.cycleTrackingLabel,
          description: t.settings.trackedFieldHintCycle,
        }
      case 'water':
        return {
          label: t.settings.waterTrackingLabel,
          description: t.settings.trackedFieldHintWater,
        }
      case 'dayTotals':
        return {
          label: t.dailyEntry.dayTotalsLabel,
          description: t.settings.trackedFieldHintDayTotals,
        }
      case 'fiber':
        return {
          label: t.dailyEntry.fiberLabel,
          description: t.settings.trackedFieldHintFiber,
        }
      case 'plannedMeals':
        return {
          label: t.settings.plannedMealsTrackingLabel,
          description: t.settings.trackedFieldHintPlannedMeals,
        }
      case 'copyYesterdayMeals':
        return {
          label: t.settings.copyYesterdayMealsTrackingLabel,
          description: t.settings.trackedFieldHintCopyYesterdayMeals,
        }
      case 'mealKcalVsYesterday':
        return {
          label: t.settings.mealKcalVsYesterdayTrackingLabel,
          description: t.settings.trackedFieldHintMealKcalVsYesterday,
        }
      case 'eatingReason':
        return {
          label: t.settings.eatingReasonTrackingLabel,
          description: t.settings.trackedFieldHintEatingReason,
        }
      case 'autoSleepScreenshot':
        return {
          label: t.settings.autoSleepScreenshotTrackingLabel,
          description: t.settings.trackedFieldHintAutoSleepScreenshot,
        }
      case 'zeppScreenshot':
        return {
          label: t.settings.zeppScreenshotTrackingLabel,
          description: t.settings.trackedFieldHintZeppScreenshot,
        }
    }
  }

  function renderTrackedRows(keys: UnifiedTrackedKey[]) {
    return (
      <div className="flex flex-col divide-y divide-border">
        {keys.map((key) => {
          const { label, description } = fieldCopy(key)
          return (
            <TrackedFieldToggleRow
              key={key}
              id={`tracked-field-${key}`}
              label={label}
              description={description}
              checked={isFieldTracked(key)}
              onCheckedChange={(value) => setFieldTracked(key, value)}
            />
          )
        })}
      </div>
    )
  }

  const screenshotTrackedKeys: UnifiedTrackedKey[] = [
    ...(isFieldTracked('sleep') ? (['autoSleepScreenshot'] as const) : []),
    ...(isFieldTracked('bodyComposition')
      ? (['zeppScreenshot'] as const)
      : []),
  ]
  const electrolyteKeys = [
    'sodium',
    'potassium',
    'magnesium',
  ] as const satisfies readonly MicronutrientField[]

  const [presetJustApplied, setPresetJustApplied] = useState(false)
  useEffect(() => {
    if (!presetJustApplied) return
    const timer = setTimeout(() => setPresetJustApplied(false), 2000)
    return () => clearTimeout(timer)
  }, [presetJustApplied])
  function handleApplyPreset(preset: TrackingPreset) {
    applyTrackingPreset(preset)
    setPresetJustApplied(true)
  }

  return (
    <>
      <SettingsPinnableCard pinId="trackingPreset">
        <CardHeader>
          <CardTitle>{t.settings.trackingPresetLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">
            {t.settings.trackingPresetDescription}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleApplyPreset('simple')}
            >
              {t.settings.trackingPresetSimpleButton}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleApplyPreset('full')}
            >
              {t.settings.trackingPresetFullButton}
            </Button>
            {presetJustApplied && (
              <span role="status" className="text-sm text-muted-foreground">
                {t.settings.trackingPresetAppliedLabel}
              </span>
            )}
          </div>
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="trackedFields">
        <CardHeader>
          <CardTitle>{t.settings.trackedFieldsLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <span className="text-sm text-muted-foreground">
            {t.settings.trackedFieldsDescription}
          </span>
          <div
            role="group"
            aria-label={t.settings.trackedFieldsMorningGroupLabel}
            className="flex flex-col gap-1"
          >
            <h3 className="text-sm font-medium">
              {t.settings.trackedFieldsMorningGroupLabel}
            </h3>
            {renderTrackedRows(morningTrackedKeys)}
          </div>
          <div
            role="group"
            aria-label={t.settings.trackedFieldsEveningGroupLabel}
            className="flex flex-col gap-1"
          >
            <h3 className="text-sm font-medium">
              {t.settings.trackedFieldsEveningGroupLabel}
            </h3>
            {renderTrackedRows(eveningTrackedKeys)}
          </div>
          <div
            role="group"
            aria-label={t.settings.trackedFieldsOtherGroupLabel}
            className="flex flex-col gap-1"
          >
            <h3 className="text-sm font-medium">
              {t.settings.trackedFieldsOtherGroupLabel}
            </h3>
            <div className="flex flex-col divide-y divide-border">
              {otherTrackedKeys.map((key) => {
                const { label, description } = fieldCopy(key)
                return (
                  <TrackedFieldToggleRow
                    key={key}
                    id={`tracked-field-${key}`}
                    label={label}
                    description={description}
                    checked={isFieldTracked(key)}
                    onCheckedChange={(value) => setFieldTracked(key, value)}
                  />
                )
              })}
              <CustomEatingReasonsEditor />
            </div>
          </div>
          <div
            role="group"
            aria-label={t.settings.trackedFieldsElectrolytesGroupLabel}
            className="flex flex-col gap-1"
          >
            <h3 className="text-sm font-medium">
              {t.settings.trackedFieldsElectrolytesGroupLabel}
            </h3>
            <div className="flex flex-col divide-y divide-border">
              {electrolyteKeys.map((key) => (
                <TrackedFieldToggleRow
                  key={key}
                  id={`tracked-field-${key}`}
                  label={
                    key === 'sodium'
                      ? t.dailyEntry.sodiumLabel
                      : key === 'potassium'
                        ? t.dailyEntry.potassiumLabel
                        : t.dailyEntry.magnesiumLabel
                  }
                  description={
                    key === 'sodium'
                      ? t.settings.trackedFieldHintSodium
                      : key === 'potassium'
                        ? t.settings.trackedFieldHintPotassium
                        : t.settings.trackedFieldHintMagnesium
                  }
                  checked={micronutrients[key]}
                  onCheckedChange={(value) =>
                    setMicronutrientTracked(key, value)
                  }
                />
              ))}
            </div>
          </div>
          {screenshotTrackedKeys.length > 0 && (
            <div
              role="group"
              aria-label={t.settings.trackedFieldsScreenshotsGroupLabel}
              className="flex flex-col gap-1"
            >
              <h3 className="text-sm font-medium">
                {t.settings.trackedFieldsScreenshotsGroupLabel}
              </h3>
              {renderTrackedRows(screenshotTrackedKeys)}
            </div>
          )}
        </CardContent>
      </SettingsPinnableCard>
    </>
  )
}
