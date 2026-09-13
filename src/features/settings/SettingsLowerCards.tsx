import { Capacitor } from '@capacitor/core'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import {
  useDailyReminderStore,
  useEntryComparisonStore,
  useLocalTransferStore,
  useNutritionFactsStore,
  useSinceLastMealTimerStore,
  useTrendChartSeriesStore,
  type TrendChartKey,
  type TrendSeriesKey,
} from '@/stores'
import { ExportSection } from '@/features/export'
import { Button } from '@/shared/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label } from '@/shared/ui/label'
import { TimeInput } from '@/shared/ui/time-input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { ClearAllDataSection } from './ClearAllDataSection'
import { DashboardChartsVisibilitySection } from './DashboardChartsVisibilitySection'
import { DeleteRangeSection } from './DeleteRangeSection'
import { HealthConnectSyncSection } from './HealthConnectSyncSection'
import { MealItemsSection } from './MealItemsSection'
import { MealLabelPresetsSection } from './MealLabelPresetsSection'
import { ProfileSection } from './ProfileSection'
import { SettingsPinnableCard } from './SettingsPinnableCard'

export function SettingsLowerCards() {
  const t = useTranslation()
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
  const trendChartVisible = useTrendChartSeriesStore((state) => state.visible)
  const toggleTrendSeries = useTrendChartSeriesStore(
    (state) => state.toggleSeries,
  )

  return (
    <>
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

      <SettingsPinnableCard pinId="export" id="export-section">
        <ExportSection />
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="deleteRange">
        <CardHeader>
          <CardTitle>{t.settings.deleteRangeLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteRangeSection />
        </CardContent>
      </SettingsPinnableCard>

      <SettingsPinnableCard pinId="clearAllData">
        <CardHeader>
          <CardTitle>{t.settings.clearAllDataLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <ClearAllDataSection />
        </CardContent>
      </SettingsPinnableCard>
    </>
  )
}
