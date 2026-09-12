import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  countUntimedSlotMeals,
  EATING_REASONS,
  isBuiltInEatingReason,
  rewriteMealEatingReason,
  stampSlotDefaultsOnUntimedMeals,
  type EatingReason,
} from '@/domain/dailyEntry'
import type { MealSlotKey } from '@/shared/lib/mealLabel'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb/dailyEntryRepository'
import {
  getDictionary,
  useLocaleStore,
  useTranslation,
  type Locale,
  type Dictionary,
} from '@/i18n'
import {
  applyTrackingPreset,
  useAlcoholTrackingStore,
  useCycleTrackingStore,
  useDailyReminderStore,
  useDayStartStore,
  useDigestionTrackingStore,
  useLastBackupStore,
  useMealSlotDefaultTimesStore,
  useNutritionFactsStore,
  useEntryComparisonStore,
  usePlannedMealsTrackingStore,
  useEatingReasonTrackingStore,
  useCopyYesterdayMealsStore,
  useMealKcalVsYesterdayStore,
  useSinceLastMealTimerStore,
  useLocalTransferStore,
  useProfileStore,
  useThemeStore,
  useTrackedFieldsStore,
  useTrendChartSeriesStore,
  useUnitStore,
  useWaterTrackingStore,
  useMicronutrientTrackingStore,
  useWeekStartStore,
  type ColorScheme,
  type Mood,
  type MicronutrientField,
  type TrackedField,
  type TrackingPreset,
  type TrendChartKey,
  type TrendSeriesKey,
  type Unit,
  type WeekStart,
} from '@/stores'
import { releaseNotes } from '@/data/releaseNotes'
import { ExportSection } from '@/features/export'
import { DashboardChartsVisibilitySection } from './DashboardChartsVisibilitySection'
import {
  backupReminderStatus,
  BACKUP_REMINDER_SNOOZE_DAYS,
} from '@/shared/lib/lastBackupReminder'
import { useSeedBackupFirstSeenAt } from '@/shared/hooks/useSeedBackupFirstSeenAt'
import { eatingReasonDisplayLabel } from '@/shared/lib/eatingReasonDisplay'
import { Button } from '@/shared/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { SettingsPinnableCard } from './SettingsPinnableCard'
import { SettingsCardsCollapseControl } from './SettingsCardsCollapseControl'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { TimeInput } from '@/shared/ui/time-input'
import { PageHeader } from '@/shared/ui/page-header'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { ClearAllDataSection } from './ClearAllDataSection'
import { DeleteRangeSection } from './DeleteRangeSection'
import { HealthConnectSyncSection } from './HealthConnectSyncSection'
import { MealItemsSection } from './MealItemsSection'
import { MealLabelPresetsSection } from './MealLabelPresetsSection'
import { ProfileSection } from './ProfileSection'
import { TrackedFieldToggleRow } from './TrackedFieldToggleRow'

// Light-mode accent per mood, for the swatch preview only — the full token
// set per mood/scheme lives in src/index.css.
const MOOD_SWATCH: Record<Mood, string> = {
  pond: '#3e7688',
  dusk: '#6e5bb5',
  sage: '#4c7a62',
  tortoise: '#75672f',
  lagoon: '#0e7c86',
}

function moodOptions(t: Dictionary): { value: Mood; label: string }[] {
  return [
    { value: 'pond', label: t.settings.moodPond },
    { value: 'dusk', label: t.settings.moodDusk },
    { value: 'sage', label: t.settings.moodSage },
    { value: 'tortoise', label: t.settings.moodTortoise },
    { value: 'lagoon', label: t.settings.moodLagoon },
  ]
}

const ALL_LOCALES: Locale[] = ['en', 'ru']

function isReservedCustomEatingReason(
  label: string,
  extraReserved: string[] = [],
): boolean {
  const trimmed = label.trim()
  if (!trimmed) return true
  if (isBuiltInEatingReason(trimmed.toLowerCase())) return true
  const lower = trimmed.toLowerCase()
  if (extraReserved.some((reason) => reason.toLowerCase() === lower)) {
    return true
  }
  return ALL_LOCALES.some((locale) => {
    const dict = getDictionary(locale)
    if (dict.dailyEntry.eatingReasonNoneOption.toLowerCase() === lower) {
      return true
    }
    return EATING_REASONS.some(
      (reason) =>
        dict.dailyEntry.eatingReasonLabel(reason).toLowerCase() === lower,
    )
  })
}

function CustomEatingReasonsEditor() {
  const t = useTranslation()
  const enabled = useEatingReasonTrackingStore((state) => state.enabled)
  const setEnabled = useEatingReasonTrackingStore((state) => state.setEnabled)
  const customReasons = useEatingReasonTrackingStore(
    (state) => state.customReasons,
  )
  const builtinLabelOverrides = useEatingReasonTrackingStore(
    (state) => state.builtinLabelOverrides,
  )
  const addCustomReason = useEatingReasonTrackingStore(
    (state) => state.addCustomReason,
  )
  const removeCustomReason = useEatingReasonTrackingStore(
    (state) => state.removeCustomReason,
  )
  const renameCustomReason = useEatingReasonTrackingStore(
    (state) => state.renameCustomReason,
  )
  const setBuiltinLabelOverride = useEatingReasonTrackingStore(
    (state) => state.setBuiltinLabelOverride,
  )
  const [newReason, setNewReason] = useState('')
  const [editingReason, setEditingReason] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  function displayLabel(reason: string): string {
    return eatingReasonDisplayLabel(reason, t, builtinLabelOverrides)
  }

  function extraReservedLabels(exceptBuiltin?: EatingReason): string[] {
    const overrideLabels = EATING_REASONS.flatMap((reason) => {
      if (reason === exceptBuiltin) return []
      const label = builtinLabelOverrides[reason]
      return label ? [label] : []
    })
    return [...overrideLabels, ...customReasons]
  }

  function submitNewReason() {
    if (isReservedCustomEatingReason(newReason, extraReservedLabels())) return
    addCustomReason(newReason)
    setNewReason('')
  }

  function commitBuiltinEdit(reason: EatingReason) {
    const trimmed = editDraft.trim()
    const defaultLabel = t.dailyEntry.eatingReasonLabel(reason)
    if (!trimmed || trimmed === defaultLabel) {
      setBuiltinLabelOverride(reason, undefined)
      setEditingReason(null)
      return
    }
    if (isReservedCustomEatingReason(trimmed, extraReservedLabels(reason))) {
      return
    }
    setBuiltinLabelOverride(reason, trimmed)
    setEditingReason(null)
  }

  async function commitCustomEdit(from: string) {
    const trimmed = editDraft.trim()
    if (!trimmed || trimmed === from) {
      setEditingReason(null)
      return
    }
    if (isReservedCustomEatingReason(trimmed, extraReservedLabels())) return
    renameCustomReason(from, trimmed)
    if (useEatingReasonTrackingStore.getState().customReasons.includes(from)) {
      return
    }
    const repo = new IndexedDbDailyEntryRepository()
    const changed = rewriteMealEatingReason(await repo.getAll(), from, trimmed)
    for (const entry of changed) {
      await repo.upsert(entry)
    }
    setEditingReason(null)
  }

  function commitRowEdit(key: string) {
    if (isBuiltInEatingReason(key)) {
      commitBuiltinEdit(key)
      return
    }
    void commitCustomEdit(key)
  }

  function startEdit(key: string, currentLabel: string) {
    setEditingReason(key)
    setEditDraft(currentLabel)
  }

  return (
    <TrackedFieldToggleRow
      id="tracked-field-eatingReason"
      label={t.settings.eatingReasonTrackingLabel}
      description={t.settings.trackedFieldHintEatingReason}
      checked={enabled}
      onCheckedChange={setEnabled}
    >
      {enabled ? (
        <>
          <Label>{t.settings.customEatingReasonsLabel}</Label>
          <p className="text-sm text-muted-foreground">
            {t.settings.customEatingReasonsDescription}
          </p>
          <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto overscroll-y-contain">
        {EATING_REASONS.map((reason) => {
          const label = displayLabel(reason)
          return (
            <li key={reason} className="flex items-center gap-2">
              {editingReason === reason ? (
                <Input
                  type="text"
                  aria-label={t.settings.editCustomEatingReasonLabel(label)}
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitRowEdit(reason)
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      setEditingReason(null)
                    }
                  }}
                  className="h-8 flex-1"
                />
              ) : (
                <span className="flex-1 text-sm">{label}</span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={
                  editingReason === reason
                    ? t.settings.saveCustomEatingReasonLabel(label)
                    : t.settings.editCustomEatingReasonLabel(label)
                }
                onClick={() => {
                  if (editingReason === reason) {
                    commitRowEdit(reason)
                    return
                  }
                  startEdit(reason, label)
                }}
              >
                {editingReason === reason ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Pencil aria-hidden="true" />
                )}
              </Button>
            </li>
          )
        })}
        {customReasons.map((reason) => (
          <li key={reason} className="flex items-center gap-2">
            {editingReason === reason ? (
              <Input
                type="text"
                aria-label={t.settings.editCustomEatingReasonLabel(reason)}
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void commitCustomEdit(reason)
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    setEditingReason(null)
                  }
                }}
                className="h-8 flex-1"
              />
            ) : (
              <span className="flex-1 text-sm">{reason}</span>
            )}
            <div className="flex shrink-0 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={
                  editingReason === reason
                    ? t.settings.saveCustomEatingReasonLabel(reason)
                    : t.settings.editCustomEatingReasonLabel(reason)
                }
                onClick={() => {
                  if (editingReason === reason) {
                    void commitCustomEdit(reason)
                    return
                  }
                  startEdit(reason, reason)
                }}
              >
                {editingReason === reason ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Pencil aria-hidden="true" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t.settings.deleteCustomEatingReasonLabel(reason)}
                onClick={() => removeCustomReason(reason)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
          </ul>
          <div className="flex items-center gap-2">
        <Input
          type="text"
          aria-label={t.settings.customEatingReasonsPlaceholder}
          placeholder={t.settings.customEatingReasonsPlaceholder}
          value={newReason}
          onChange={(e) => setNewReason(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submitNewReason()
            }
          }}
          className="h-8 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={submitNewReason}
        >
          {t.dailyEntry.addButton}
        </Button>
          </div>
        </>
      ) : null}
    </TrackedFieldToggleRow>
  )
}

export function SettingsScreen() {
  const t = useTranslation()
  const unit = useUnitStore((state) => state.unit)
  const setUnit = useUnitStore((state) => state.setUnit)
  const locale = useLocaleStore((state) => state.locale)
  const setLocale = useLocaleStore((state) => state.setLocale)
  const mood = useThemeStore((state) => state.mood)
  const setMood = useThemeStore((state) => state.setMood)
  const colorScheme = useThemeStore((state) => state.colorScheme)
  const setColorScheme = useThemeStore((state) => state.setColorScheme)
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
  // #237: unified "what to track" section — the 5 fields that never had
  // their own opt-out (trackedFieldsStore) plus cycle/constipation/water
  // tracking's existing opt-in toggles above, folded into the same UI
  // even though they keep their own separate stores (real persisted data
  // already in production; no benefit to migrating it into one store).
  const trackedFields = useTrackedFieldsStore((state) => state.tracked)
  const setTrackedField = useTrackedFieldsStore((state) => state.setTracked)
  // #638 — the night-eating toggle label below needs the real profile sex,
  // same as every other `nightEatingLabel` caller (DayDetail.tsx etc.),
  // instead of always falling back to the gender-neutral "Ел(а)".
  const sex = useProfileStore((state) => state.sex)
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
  // #528 — same fields as before, grouped to match Day's Morning / Evening
  // blocks (plus Other for toggles that live elsewhere). Weight stays
  // always-on and is not in this list.
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
  // #749 — only listed when the parent field is on, so someone who does
  // not track sleep never sees an AutoSleep screenshot toggle.
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
  const dayStartTime = useDayStartStore((state) => state.dayStartTime)
  const setDayStartTime = useDayStartStore((state) => state.setDayStartTime)
  const mealSlotDefaultTimes = useMealSlotDefaultTimesStore(
    (state) => state.times,
  )
  const setMealSlotTime = useMealSlotDefaultTimesStore(
    (state) => state.setSlotTime,
  )
  // #595 — after changing a slot clock, offer to stamp existing untimed meals.
  const [slotApplyConfirmCount, setSlotApplyConfirmCount] = useState<
    number | null
  >(null)
  const [slotApplyDone, setSlotApplyDone] = useState<string | null>(null)
  const [slotApplyBusy, setSlotApplyBusy] = useState(false)
  const slotFocusValueRef = useRef<Partial<Record<MealSlotKey, string>>>({})

  async function offerApplySlotDefaults(previous: string, next: string) {
    if (previous === next) return
    const entries = await new IndexedDbDailyEntryRepository().getAll()
    const count = countUntimedSlotMeals(entries)
    if (count === 0) return
    setSlotApplyDone(null)
    setSlotApplyConfirmCount(count)
  }

  async function applySlotDefaultsToExisting() {
    setSlotApplyBusy(true)
    try {
      const repo = new IndexedDbDailyEntryRepository()
      const entries = await repo.getAll()
      const { entries: changed, mealCount } = stampSlotDefaultsOnUntimedMeals(
        entries,
        useMealSlotDefaultTimesStore.getState().times,
      )
      for (const entry of changed) {
        await repo.upsert(entry)
      }
      setSlotApplyConfirmCount(null)
      setSlotApplyDone(t.settings.mealSlotApplyDoneLabel(mealCount))
    } finally {
      setSlotApplyBusy(false)
    }
  }

  const weekStart = useWeekStartStore((state) => state.weekStart)
  const setWeekStart = useWeekStartStore((state) => state.setWeekStart)
  const dailyReminderEnabled = useDailyReminderStore((state) => state.enabled)
  const setDailyReminderEnabled = useDailyReminderStore(
    (state) => state.setEnabled,
  )
  const dailyReminderTime = useDailyReminderStore((state) => state.reminderTime)
  const setDailyReminderTime = useDailyReminderStore(
    (state) => state.setReminderTime,
  )
  const nutritionFactsEnabled = useNutritionFactsStore((state) => state.enabled)
  const setNutritionFactsEnabled = useNutritionFactsStore(
    (state) => state.setEnabled,
  )
  const sinceLastMealTimerEnabled = useSinceLastMealTimerStore(
    (state) => state.enabled,
  )
  const setSinceLastMealTimerEnabled = useSinceLastMealTimerStore(
    (state) => state.setEnabled,
  )
  const entryComparisonEnabled = useEntryComparisonStore(
    (state) => state.enabled,
  )
  const setEntryComparisonEnabled = useEntryComparisonStore(
    (state) => state.setEnabled,
  )
  const localTransferEnabled = useLocalTransferStore((state) => state.enabled)
  const setLocalTransferEnabled = useLocalTransferStore(
    (state) => state.setEnabled,
  )
  // #238: a safety net independent of the Dashboard's own legend toggles —
  // reported live that turning both series off there made the toggle
  // buttons themselves disappear along with the chart, a dead end with no
  // way back (fixed on the charts too). This card is always reachable
  // regardless of what state either chart is in.
  const trendChartVisible = useTrendChartSeriesStore((state) => state.visible)
  const toggleTrendSeries = useTrendChartSeriesStore(
    (state) => state.toggleSeries,
  )
  // #283 — a compact clickable version badge at the top of the page,
  // since the full About card (with this same version, #63) otherwise
  // sits in the middle/bottom of a long Settings page. Most-recent-first
  // (releaseNotes.ts), so the first entry's version is the current one,
  // same derivation AboutScreen.tsx already uses.
  const currentVersion = releaseNotes[0]?.version

  // #599 — quiet, dismissible nudge once the JSON backup (or the app
  // itself, if one has never happened) has gone stale; see
  // `lastBackupReminder.ts` for the threshold/snooze constants.
  // Backdates `firstSeenAt` to the earliest real logging date, if any
  // exists, before it's read below — see `useSeedBackupFirstSeenAt.ts`.
  useSeedBackupFirstSeenAt()
  const backupFirstSeenAt = useLastBackupStore((state) => state.firstSeenAt)
  const backupLastExportedAt = useLastBackupStore(
    (state) => state.lastExportedAt,
  )
  const backupDismissedUntil = useLastBackupStore(
    (state) => state.dismissedUntil,
  )
  const dismissBackupReminder = useLastBackupStore(
    (state) => state.dismissReminder,
  )
  const backupReminder = backupReminderStatus(
    {
      firstSeenAt: backupFirstSeenAt,
      lastExportedAt: backupLastExportedAt,
      dismissedUntil: backupDismissedUntil,
    },
    new Date(),
  )

  // #604 — brief "Applied" confirmation, same auto-clearing shape
  // GoalForm.tsx's justSaved already established.
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
    <div className="flex flex-col gap-4">
      <div style={{ order: -4000 }}>
        <PageHeader
        title={t.settings.title}
        description={t.settings.description}
        action={
          currentVersion !== undefined && (
            <Link
              to="/about"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t.settings.versionBadgeLabel(currentVersion)}
            </Link>
          )
        }
      />
      </div>

      <SettingsCardsCollapseControl />

      {/* #599 — quiet, dismissible nudge once the backup's gone stale (see
       * `lastBackupReminder.ts`); a snooze suppresses it for
       * BACKUP_REMINDER_SNOOZE_DAYS rather than forever. Sits at the very
       * top so it's seen without scrolling; the link jumps down to the
       * Export card (`#export-section`) rather than duplicating its UI. */}
      {backupReminder.show && (
        <div
          role="status"
          style={{ order: -3000 }}
          className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2"
        >
          <span className="text-sm text-muted-foreground">
            {backupReminder.days === null
              ? t.export.lastBackupNeverLabel
              : t.export.lastBackupAgoLabel(backupReminder.days)}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" asChild>
              <a href="#export-section">
                {t.export.backupReminderGoToExportLabel}
              </a>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.export.dismissBackupReminderLabel}
              onClick={() => {
                const snoozeUntil = new Date()
                snoozeUntil.setDate(
                  snoozeUntil.getDate() + BACKUP_REMINDER_SNOOZE_DAYS,
                )
                dismissBackupReminder(snoozeUntil.toISOString())
              }}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* #498 — About / Features promoted to the top so trust and
       * capabilities aren't buried under recipes/metrics. #504 keeps
       * Export in its prior lower placement (backup/storage with the
       * destructive clear/delete group), not at the top with these cards. */}
      <SettingsPinnableCard pinId="about" pinnable={false} style={{ order: -2000 }}>
        <CardHeader>
          <CardTitle>{t.settings.aboutLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">
            {t.settings.aboutDescription}
          </span>
          <Button variant="outline" size="sm" className="self-start" asChild>
            <Link to="/about">{t.settings.viewAboutButton}</Link>
          </Button>
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="features">
        <CardHeader>
          <CardTitle>{t.settings.featuresLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">
            {t.settings.featuresDescription}
          </span>
          <Button variant="outline" size="sm" className="self-start" asChild>
            <Link to="/features">{t.settings.viewFeaturesButton}</Link>
          </Button>
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="units">
        <CardHeader>
          <CardTitle>{t.settings.unitsLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            type="single"
            aria-label={t.settings.unitsLabel}
            value={unit}
            onValueChange={(value) => value && setUnit(value as Unit)}
          >
            <ToggleGroupItem value="kg" className="h-12">
              {t.common.kg}
            </ToggleGroupItem>
            <ToggleGroupItem value="lb" className="h-12">
              {t.common.lb}
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="weekStart">
        <CardHeader>
          <CardTitle>{t.settings.weekStartLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">
            {t.settings.weekStartDescription}
          </span>
          <ToggleGroup
            type="single"
            aria-label={t.settings.weekStartLabel}
            value={weekStart}
            onValueChange={(value) => value && setWeekStart(value as WeekStart)}
          >
            <ToggleGroupItem value="monday" className="h-12">
              {t.settings.weekStartMonday}
            </ToggleGroupItem>
            <ToggleGroupItem value="firstEntryWeekday" className="h-12">
              {t.settings.weekStartFirstEntry}
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="dayStart">
        <CardHeader>
          <CardTitle>{t.settings.dayStartLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">
            {t.settings.dayStartDescription}
          </span>
          <TimeInput
            aria-label={t.settings.dayStartLabel}
            value={dayStartTime}
            onChange={(e) => setDayStartTime(e.target.value)}
            className="w-32"
          />
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="mealSlotTimes">
        <CardHeader>
          <CardTitle>{t.settings.mealSlotDefaultTimesLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <span className="text-sm text-muted-foreground">
            {t.settings.mealSlotDefaultTimesDescription}
          </span>
          <div className="flex flex-col gap-3">
            {(
              [
                ['breakfast', t.dailyEntry.defaultMealNamePresets[0]],
                ['lunch', t.dailyEntry.defaultMealNamePresets[1]],
                ['snack', t.dailyEntry.defaultMealNamePresets[3]],
                ['dinner', t.dailyEntry.defaultMealNamePresets[2]],
              ] as const
            ).map(([slot, label]) => (
              <div key={slot} className="flex flex-col gap-1.5">
                <Label htmlFor={`settings-meal-slot-${slot}`}>{label}</Label>
                <TimeInput
                  id={`settings-meal-slot-${slot}`}
                  aria-label={label}
                  value={mealSlotDefaultTimes[slot]}
                  onFocus={() => {
                    slotFocusValueRef.current[slot] = mealSlotDefaultTimes[slot]
                  }}
                  onChange={(e) => setMealSlotTime(slot, e.target.value)}
                  onBlur={(e) => {
                    const previous = slotFocusValueRef.current[slot] ?? ''
                    void offerApplySlotDefaults(previous, e.target.value)
                  }}
                  className="w-32"
                />
              </div>
            ))}
          </div>
          {slotApplyConfirmCount !== null && (
            <div
              role="alertdialog"
              aria-label={t.settings.mealSlotApplyConfirmLabel(
                slotApplyConfirmCount,
              )}
              className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3"
            >
              <p className="text-sm text-foreground">
                {t.settings.mealSlotApplyConfirmLabel(slotApplyConfirmCount)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={slotApplyBusy}
                  onClick={() => void applySlotDefaultsToExisting()}
                >
                  {t.settings.mealSlotApplyConfirmYes}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={slotApplyBusy}
                  onClick={() => setSlotApplyConfirmCount(null)}
                >
                  {t.settings.mealSlotApplyConfirmNo}
                </Button>
              </div>
            </div>
          )}
          {slotApplyDone && (
            <p className="text-sm text-muted-foreground" role="status">
              {slotApplyDone}
            </p>
          )}
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="language">
        <CardHeader>
          <CardTitle>{t.settings.languageLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            type="single"
            aria-label={t.settings.languageLabel}
            value={locale}
            onValueChange={(value) => value && setLocale(value as Locale)}
          >
            <ToggleGroupItem value="en" className="h-12">
              {t.settings.english}
            </ToggleGroupItem>
            <ToggleGroupItem value="ru" className="h-12">
              {t.settings.russian}
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="appearance">
        <CardHeader>
          <CardTitle>{t.settings.appearanceLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">
              {t.settings.moodLabel}
            </span>
            <ToggleGroup
              type="single"
              aria-label={t.settings.moodLabel}
              value={mood}
              onValueChange={(value) => value && setMood(value as Mood)}
            >
              {moodOptions(t).map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  className="h-12"
                >
                  <span
                    aria-hidden="true"
                    className="size-3 rounded-full"
                    style={{ background: MOOD_SWATCH[option.value] }}
                  />
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">
              {t.settings.colorSchemeLabel}
            </span>
            <ToggleGroup
              type="single"
              aria-label={t.settings.colorSchemeLabel}
              value={colorScheme}
              onValueChange={(value) =>
                value && setColorScheme(value as ColorScheme)
              }
            >
              <ToggleGroupItem value="system" className="h-12">
                {t.settings.systemColorScheme}
              </ToggleGroupItem>
              <ToggleGroupItem value="light" className="h-12">
                {t.settings.light}
              </ToggleGroupItem>
              <ToggleGroupItem value="dark" className="h-12">
                {t.settings.dark}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardContent>
      </SettingsPinnableCard>

      {/* #604 — one-tap starting point for Day's density, right above the
       * manual per-field toggles below; every field stays individually
       * editable afterward either way. */}
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

      <SettingsPinnableCard pinId="profile">
        <CardHeader>
          <CardTitle>{t.settings.profileLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileSection />
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="dailyReminder">
        <CardHeader>
          <CardTitle>{t.settings.dailyReminderLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">
            {t.settings.dailyReminderDescription}
          </span>
          <ToggleGroup
            type="single"
            aria-label={t.settings.dailyReminderLabel}
            value={dailyReminderEnabled ? 'on' : 'off'}
            onValueChange={(value) =>
              value && setDailyReminderEnabled(value === 'on')
            }
          >
            <ToggleGroupItem value="off" className="h-12">
              {t.settings.dailyReminderOff}
            </ToggleGroupItem>
            <ToggleGroupItem value="on" className="h-12">
              {t.settings.dailyReminderOn}
            </ToggleGroupItem>
          </ToggleGroup>
          {/* #605 — only meaningful on native: web/PWA's reminder is still
           * just the in-app banner, which has no time of its own. */}
          {dailyReminderEnabled && Capacitor.isNativePlatform() && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-daily-reminder-time">
                {t.settings.dailyReminderTimeLabel}
              </Label>
              <TimeInput
                id="settings-daily-reminder-time"
                aria-label={t.settings.dailyReminderTimeLabel}
                value={dailyReminderTime}
                onChange={(e) => setDailyReminderTime(e.target.value)}
                className="w-32"
              />
            </div>
          )}
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="nutritionFacts">
        <CardHeader>
          <CardTitle>{t.settings.nutritionFactsLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">
            {t.settings.nutritionFactsDescription}
          </span>
          <ToggleGroup
            type="single"
            aria-label={t.settings.nutritionFactsLabel}
            value={nutritionFactsEnabled ? 'on' : 'off'}
            onValueChange={(value) =>
              value && setNutritionFactsEnabled(value === 'on')
            }
          >
            <ToggleGroupItem value="off" className="h-12">
              {t.settings.nutritionFactsOff}
            </ToggleGroupItem>
            <ToggleGroupItem value="on" className="h-12">
              {t.settings.nutritionFactsOn}
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="sinceLastMealTimer">
        <CardHeader>
          <CardTitle>{t.settings.sinceLastMealTimerLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">
            {t.settings.sinceLastMealTimerDescription}
          </span>
          <ToggleGroup
            type="single"
            aria-label={t.settings.sinceLastMealTimerLabel}
            value={sinceLastMealTimerEnabled ? 'on' : 'off'}
            onValueChange={(value) =>
              value && setSinceLastMealTimerEnabled(value === 'on')
            }
          >
            <ToggleGroupItem value="off" className="h-12">
              {t.settings.sinceLastMealTimerOff}
            </ToggleGroupItem>
            <ToggleGroupItem value="on" className="h-12">
              {t.settings.sinceLastMealTimerOn}
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="entryComparison">
        <CardHeader>
          <CardTitle>{t.settings.entryComparisonLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">
            {t.settings.entryComparisonDescription}
          </span>
          <ToggleGroup
            type="single"
            aria-label={t.settings.entryComparisonLabel}
            value={entryComparisonEnabled ? 'on' : 'off'}
            onValueChange={(value) =>
              value && setEntryComparisonEnabled(value === 'on')
            }
          >
            <ToggleGroupItem value="off" className="h-12">
              {t.settings.entryComparisonOff}
            </ToggleGroupItem>
            <ToggleGroupItem value="on" className="h-12">
              {t.settings.entryComparisonOn}
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="localTransfer">
        <CardHeader>
          <CardTitle>{t.settings.localTransferLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">
            {t.settings.localTransferDescription}
          </span>
          <ToggleGroup
            type="single"
            aria-label={t.settings.localTransferLabel}
            value={localTransferEnabled ? 'on' : 'off'}
            onValueChange={(value) =>
              value && setLocalTransferEnabled(value === 'on')
            }
          >
            <ToggleGroupItem value="off" className="h-12">
              {t.settings.localTransferOff}
            </ToggleGroupItem>
            <ToggleGroupItem value="on" className="h-12">
              {t.settings.localTransferOn}
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </SettingsPinnableCard>

      {/* #656 — Health Connect is an Android platform API, not available
       * on iOS/web; gated at the call site same as the daily reminder
       * time picker just above. */}
      {Capacitor.getPlatform() === 'android' && (
        <SettingsPinnableCard pinId="healthConnect">
          <CardHeader>
            <CardTitle>{t.settings.healthConnectSyncLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <HealthConnectSyncSection />
          </CardContent>
        </SettingsPinnableCard>
      )}

      <SettingsPinnableCard pinId="dashboardCharts">
        <CardHeader>
          <CardTitle>{t.settings.dashboardChartsLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardChartsVisibilitySection />
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="trendCharts">
        <CardHeader>
          <CardTitle>{t.settings.trendChartsLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <span className="text-sm text-muted-foreground">
            {t.settings.trendChartsDescription}
          </span>
          {(
            [
              ['weight', t.settings.weightTrendLabel, t.dashboard.weightLegend],
              [
                'calories',
                t.settings.calorieTrendLabel,
                t.dashboard.caloriesLegend,
              ],
            ] as [TrendChartKey, string, string][]
          ).map(([chart, chartLabel, rawLabel]) => (
            <div key={chart} className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">
                {chartLabel}
              </span>
              <ToggleGroup
                type="multiple"
                aria-label={chartLabel}
                value={(['raw', 'average'] as TrendSeriesKey[]).filter(
                  (series) => trendChartVisible[chart][series],
                )}
                onValueChange={(value: string[]) => {
                  for (const series of ['raw', 'average'] as TrendSeriesKey[]) {
                    const shouldBeOn = value.includes(series)
                    if (shouldBeOn !== trendChartVisible[chart][series]) {
                      toggleTrendSeries(chart, series)
                    }
                  }
                }}
              >
                <ToggleGroupItem value="raw" className="h-12">
                  {rawLabel}
                </ToggleGroupItem>
                <ToggleGroupItem value="average" className="h-12">
                  {t.dashboard.rollingAverageLegend}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          ))}
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="mealItems">
        <CardHeader>
          <CardTitle>{t.settings.mealItemsLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <MealItemsSection />
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="mealNamePresets">
        <CardHeader>
          <CardTitle>{t.settings.mealNamePresetsLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <MealLabelPresetsSection />
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="foodList">
        <CardHeader>
          <CardTitle>{t.settings.foodListLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">
            {t.settings.foodListDescription}
          </span>
          <Button variant="outline" size="sm" className="self-start" asChild>
            <Link to="/settings/foods">{t.settings.manageFoodListButton}</Link>
          </Button>
        </CardContent>
      </SettingsPinnableCard>

      {/* #251 — same "description + link button" shape as the Food list
       * card above, reached from Settings rather than adding another
       * bottom-nav tab. */}
      <SettingsPinnableCard pinId="recipes">
        <CardHeader>
          <CardTitle>{t.recipes.settingsSectionLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">
            {t.recipes.settingsSectionDescription}
          </span>
          <Button variant="outline" size="sm" className="self-start" asChild>
            <Link to="/settings/recipes">{t.recipes.manageRecipesButton}</Link>
          </Button>
        </CardContent>
      </SettingsPinnableCard>

      {/* #336 — same "description + link button" shape as Recipes/Food
       * list above. */}
      <SettingsPinnableCard pinId="customMetrics">
        <CardHeader>
          <CardTitle>{t.customMetrics.settingsSectionLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">
            {t.customMetrics.settingsSectionDescription}
          </span>
          <Button variant="outline" size="sm" className="self-start" asChild>
            <Link to="/settings/custom-metrics">
              {t.customMetrics.manageCustomMetricsButton}
            </Link>
          </Button>
        </CardContent>
      </SettingsPinnableCard>

      {/* #612 — mental model for phone/laptop users, right above Export:
       * this app has no live sync (local-first by design), so the manual
       * export/import relationship needs spelling out instead of being
       * guessed at from the button labels alone. */}
      <SettingsPinnableCard pinId="twoDevicesHelp">
        <CardHeader>
          <CardTitle>{t.settings.twoDevicesHelpLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">
            {t.settings.twoDevicesHelpIntro}
          </span>
          <ol className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {t.settings.twoDevicesHelpSteps.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span aria-hidden="true">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </SettingsPinnableCard>

      {/* #504 — Export stays above the destructive clear/delete actions
       * (#164), after preference/list-management cards — not promoted
       * with About/Features at the top (#498 side effect, reverted). */}
      <SettingsPinnableCard pinId="export" id="export-section">
        <ExportSection />
      </SettingsPinnableCard>

      {/* #377 — a smaller-blast-radius destructive action than "clear
       * everything" below, so it goes right before it in this same
       * end-of-page destructive-actions group (#164's own placement
       * reasoning: irreversible actions belong at the end, not mixed in
       * among routine preference toggles). */}
      <SettingsPinnableCard pinId="deleteRange">
        <CardHeader>
          <CardTitle>{t.settings.deleteRangeLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteRangeSection />
        </CardContent>
      </SettingsPinnableCard>

      {/* Last (#164) — a destructive, irreversible action belongs at the
       * end of the page, not mixed in among routine preference toggles. */}
      <SettingsPinnableCard pinId="clearAllData">
        <CardHeader>
          <CardTitle>{t.settings.clearAllDataLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <ClearAllDataSection />
        </CardContent>
      </SettingsPinnableCard>
    </div>
  )
}
