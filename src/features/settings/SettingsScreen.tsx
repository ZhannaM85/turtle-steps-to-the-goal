import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  countUntimedSlotMeals,
  stampSlotDefaultsOnUntimedMeals,
} from '@/domain/dailyEntry'
import type { MealSlotKey } from '@/shared/lib/mealLabel'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb/dailyEntryRepository'
import {
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
  useCopyYesterdayMealsStore,
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
  type TrackedField,
  type TrackingPreset,
  type TrendChartKey,
  type TrendSeriesKey,
  type Unit,
  type WeekStart,
} from '@/stores'
import { releaseNotes } from '@/data/releaseNotes'
import { ExportSection } from '@/features/export'
import {
  backupReminderStatus,
  BACKUP_REMINDER_SNOOZE_DAYS,
} from '@/shared/lib/lastBackupReminder'
import { useSeedBackupFirstSeenAt } from '@/shared/hooks/useSeedBackupFirstSeenAt'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { PageHeader } from '@/shared/ui/page-header'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { ClearAllDataSection } from './ClearAllDataSection'
import { DeleteRangeSection } from './DeleteRangeSection'
import { HealthConnectSyncSection } from './HealthConnectSyncSection'
import { MealItemsSection } from './MealItemsSection'
import { MealLabelPresetsSection } from './MealLabelPresetsSection'
import { ProfileSection } from './ProfileSection'

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
  const copyYesterdayMealsEnabled = useCopyYesterdayMealsStore(
    (state) => state.enabled,
  )
  const setCopyYesterdayMealsEnabled = useCopyYesterdayMealsStore(
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
    | 'copyYesterdayMeals'
  // #528 — same fields as before, grouped to match Day's Morning / Evening
  // blocks (plus Other for toggles that live elsewhere). Weight stays
  // always-on and is not in this list.
  const morningTrackedKeys: UnifiedTrackedKey[] = [
    'sleep',
    'bodyMeasurements',
    'bodyComposition',
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
  ]
  function isFieldTracked(key: UnifiedTrackedKey): boolean {
    if (key === 'cycle') return cycleTrackingEnabled
    if (key === 'constipation') return digestionTrackingEnabled
    if (key === 'alcohol') return alcoholTrackingEnabled
    if (key === 'water') return waterTrackingEnabled
    if (key === 'plannedMeals') return plannedMealsTrackingEnabled
    if (key === 'copyYesterdayMeals') return copyYesterdayMealsEnabled
    return trackedFields[key]
  }
  function setFieldTracked(key: UnifiedTrackedKey, value: boolean) {
    if (key === 'cycle') setCycleTrackingEnabled(value)
    else if (key === 'constipation') setDigestionTrackingEnabled(value)
    else if (key === 'alcohol') setAlcoholTrackingEnabled(value)
    else if (key === 'water') setWaterTrackingEnabled(value)
    else if (key === 'plannedMeals') setPlannedMealsTrackingEnabled(value)
    else if (key === 'copyYesterdayMeals') setCopyYesterdayMealsEnabled(value)
    else setTrackedField(key, value)
  }
  function trackedGroupValueChange(
    keys: UnifiedTrackedKey[],
    value: string[],
  ) {
    for (const key of keys) {
      const shouldBeOn = value.includes(key)
      if (shouldBeOn !== isFieldTracked(key)) {
        setFieldTracked(key, shouldBeOn)
      }
    }
  }
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
  const entryComparisonEnabled = useEntryComparisonStore(
    (state) => state.enabled,
  )
  const setEntryComparisonEnabled = useEntryComparisonStore(
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

      {/* #599 — quiet, dismissible nudge once the backup's gone stale (see
       * `lastBackupReminder.ts`); a snooze suppresses it for
       * BACKUP_REMINDER_SNOOZE_DAYS rather than forever. Sits at the very
       * top so it's seen without scrolling; the link jumps down to the
       * Export card (`#export-section`) rather than duplicating its UI. */}
      {backupReminder.show && (
        <div
          role="status"
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
      <Card>
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
      </Card>

      <Card>
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
      </Card>

      <Card>
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
      </Card>

      <Card>
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
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.dayStartLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">
            {t.settings.dayStartDescription}
          </span>
          <Input
            type="time"
            aria-label={t.settings.dayStartLabel}
            value={dayStartTime}
            onChange={(e) => setDayStartTime(e.target.value)}
            className="h-12 w-32"
          />
        </CardContent>
      </Card>

      <Card>
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
                <Input
                  id={`settings-meal-slot-${slot}`}
                  type="time"
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
                  className="h-12 w-32"
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
      </Card>

      <Card>
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
      </Card>

      <Card>
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
      </Card>

      {/* #604 — one-tap starting point for Day's density, right above the
       * manual per-field toggles below; every field stays individually
       * editable afterward either way. */}
      <Card>
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
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.trackedFieldsLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <span className="text-sm text-muted-foreground">
            {t.settings.trackedFieldsDescription}
          </span>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t.settings.trackedFieldsMorningGroupLabel}
            </span>
            <ToggleGroup
              type="multiple"
              aria-label={t.settings.trackedFieldsMorningGroupLabel}
              value={morningTrackedKeys.filter(isFieldTracked)}
              onValueChange={(value: string[]) =>
                trackedGroupValueChange(morningTrackedKeys, value)
              }
              className="flex-wrap"
            >
              <ToggleGroupItem value="sleep" className="h-12">
                {t.dailyEntry.sleepLabel}
              </ToggleGroupItem>
              <ToggleGroupItem value="bodyMeasurements" className="h-12">
                {t.dailyEntry.bodyMeasurementsLabel}
              </ToggleGroupItem>
              <ToggleGroupItem value="bodyComposition" className="h-12">
                {t.dailyEntry.bodyCompositionLabel}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t.settings.trackedFieldsEveningGroupLabel}
            </span>
            <ToggleGroup
              type="multiple"
              aria-label={t.settings.trackedFieldsEveningGroupLabel}
              value={eveningTrackedKeys.filter(isFieldTracked)}
              onValueChange={(value: string[]) =>
                trackedGroupValueChange(eveningTrackedKeys, value)
              }
              className="flex-wrap"
            >
              <ToggleGroupItem value="steps" className="h-12">
                {t.dailyEntry.stepsLabel}
              </ToggleGroupItem>
              <ToggleGroupItem value="note" className="h-12">
                {t.dailyEntry.noteLabel}
              </ToggleGroupItem>
              <ToggleGroupItem value="mood" className="h-12">
                {t.dailyEntry.dayMoodLabel}
              </ToggleGroupItem>
              <ToggleGroupItem value="constipation" className="h-12">
                {t.settings.digestionTrackingLabel}
              </ToggleGroupItem>
              <ToggleGroupItem value="alcohol" className="h-12">
                {t.settings.alcoholTrackingLabel}
              </ToggleGroupItem>
              <ToggleGroupItem value="nightEating" className="h-12">
                {t.dailyEntry.nightEatingLabel(sex)}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t.settings.trackedFieldsOtherGroupLabel}
            </span>
            <ToggleGroup
              type="multiple"
              aria-label={t.settings.trackedFieldsOtherGroupLabel}
              value={otherTrackedKeys.filter(isFieldTracked)}
              onValueChange={(value: string[]) =>
                trackedGroupValueChange(otherTrackedKeys, value)
              }
              className="flex-wrap"
            >
              <ToggleGroupItem value="cycle" className="h-12">
                {t.settings.cycleTrackingLabel}
              </ToggleGroupItem>
              <ToggleGroupItem value="water" className="h-12">
                {t.settings.waterTrackingLabel}
              </ToggleGroupItem>
              <ToggleGroupItem value="dayTotals" className="h-12">
                {t.dailyEntry.dayTotalsLabel}
              </ToggleGroupItem>
              <ToggleGroupItem value="fiber" className="h-12">
                {t.dailyEntry.fiberLabel}
              </ToggleGroupItem>
              <ToggleGroupItem value="plannedMeals" className="h-12">
                {t.settings.plannedMealsTrackingLabel}
              </ToggleGroupItem>
              <ToggleGroupItem value="copyYesterdayMeals" className="h-12">
                {t.settings.copyYesterdayMealsTrackingLabel}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t.settings.trackedFieldsElectrolytesGroupLabel}
            </span>
            <ToggleGroup
              type="multiple"
              aria-label={t.settings.trackedFieldsElectrolytesGroupLabel}
              value={(
                ['sodium', 'potassium', 'magnesium'] as const
              ).filter((key) => micronutrients[key])}
              onValueChange={(value: string[]) => {
                for (const key of ['sodium', 'potassium', 'magnesium'] as const) {
                  const shouldBeOn = value.includes(key)
                  if (shouldBeOn !== micronutrients[key]) {
                    setMicronutrientTracked(key, shouldBeOn)
                  }
                }
              }}
              className="flex-wrap"
            >
              <ToggleGroupItem value="sodium" className="h-12">
                {t.dailyEntry.sodiumLabel}
              </ToggleGroupItem>
              <ToggleGroupItem value="potassium" className="h-12">
                {t.dailyEntry.potassiumLabel}
              </ToggleGroupItem>
              <ToggleGroupItem value="magnesium" className="h-12">
                {t.dailyEntry.magnesiumLabel}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.profileLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileSection />
        </CardContent>
      </Card>

      <Card>
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
              <Input
                id="settings-daily-reminder-time"
                type="time"
                aria-label={t.settings.dailyReminderTimeLabel}
                value={dailyReminderTime}
                onChange={(e) => setDailyReminderTime(e.target.value)}
                className="h-12 w-32"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
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
      </Card>

      <Card>
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
      </Card>

      {/* #656 — Health Connect is an Android platform API, not available
       * on iOS/web; gated at the call site same as the daily reminder
       * time picker just above. */}
      {Capacitor.getPlatform() === 'android' && (
        <Card>
          <CardHeader>
            <CardTitle>{t.settings.healthConnectSyncLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <HealthConnectSyncSection />
          </CardContent>
        </Card>
      )}

      <Card>
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
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.mealItemsLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <MealItemsSection />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.mealNamePresetsLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <MealLabelPresetsSection />
        </CardContent>
      </Card>

      <Card>
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
      </Card>

      {/* #251 — same "description + link button" shape as the Food list
       * card above, reached from Settings rather than adding another
       * bottom-nav tab. */}
      <Card>
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
      </Card>

      {/* #336 — same "description + link button" shape as Recipes/Food
       * list above. */}
      <Card>
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
      </Card>

      {/* #612 — mental model for phone/laptop users, right above Export:
       * this app has no live sync (local-first by design), so the manual
       * export/import relationship needs spelling out instead of being
       * guessed at from the button labels alone. */}
      <Card>
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
      </Card>

      {/* #504 — Export stays above the destructive clear/delete actions
       * (#164), after preference/list-management cards — not promoted
       * with About/Features at the top (#498 side effect, reverted). */}
      <Card id="export-section">
        <ExportSection />
      </Card>

      {/* #377 — a smaller-blast-radius destructive action than "clear
       * everything" below, so it goes right before it in this same
       * end-of-page destructive-actions group (#164's own placement
       * reasoning: irreversible actions belong at the end, not mixed in
       * among routine preference toggles). */}
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.deleteRangeLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteRangeSection />
        </CardContent>
      </Card>

      {/* Last (#164) — a destructive, irreversible action belongs at the
       * end of the page, not mixed in among routine preference toggles. */}
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.clearAllDataLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <ClearAllDataSection />
        </CardContent>
      </Card>
    </div>
  )
}
