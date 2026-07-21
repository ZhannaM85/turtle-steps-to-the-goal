import { Link } from 'react-router-dom'
import {
  useLocaleStore,
  useTranslation,
  type Locale,
  type Dictionary,
} from '@/i18n'
import {
  useCycleTrackingStore,
  useDailyReminderStore,
  useDigestionTrackingStore,
  useThemeStore,
  useTrendChartSeriesStore,
  useUnitStore,
  useWeekStartStore,
  type Mood,
  type TrendChartKey,
  type TrendSeriesKey,
  type Unit,
  type WeekStart,
} from '@/stores'
import { ExportSection } from '@/features/export'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { PageHeader } from '@/shared/ui/page-header'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { ClearAllDataSection } from './ClearAllDataSection'
import { MealItemsSection } from './MealItemsSection'
import { MealLabelPresetsSection } from './MealLabelPresetsSection'

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
  const weekStart = useWeekStartStore((state) => state.weekStart)
  const setWeekStart = useWeekStartStore((state) => state.setWeekStart)
  const dailyReminderEnabled = useDailyReminderStore((state) => state.enabled)
  const setDailyReminderEnabled = useDailyReminderStore(
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

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.settings.title}
        description={t.settings.description}
      />

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
                value && setColorScheme(value as 'light' | 'dark')
              }
            >
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

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.cycleTrackingLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">
            {t.settings.cycleTrackingDescription}
          </span>
          <ToggleGroup
            type="single"
            aria-label={t.settings.cycleTrackingLabel}
            value={cycleTrackingEnabled ? 'on' : 'off'}
            onValueChange={(value) =>
              value && setCycleTrackingEnabled(value === 'on')
            }
          >
            <ToggleGroupItem value="off" className="h-12">
              {t.settings.cycleTrackingOff}
            </ToggleGroupItem>
            <ToggleGroupItem value="on" className="h-12">
              {t.settings.cycleTrackingOn}
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.digestionTrackingLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">
            {t.settings.digestionTrackingDescription}
          </span>
          <ToggleGroup
            type="single"
            aria-label={t.settings.digestionTrackingLabel}
            value={digestionTrackingEnabled ? 'on' : 'off'}
            onValueChange={(value) =>
              value && setDigestionTrackingEnabled(value === 'on')
            }
          >
            <ToggleGroupItem value="off" className="h-12">
              {t.settings.digestionTrackingOff}
            </ToggleGroupItem>
            <ToggleGroupItem value="on" className="h-12">
              {t.settings.digestionTrackingOn}
            </ToggleGroupItem>
          </ToggleGroup>
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
        </CardContent>
      </Card>

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

      {/* #234: moved out of the bottom nav (6 tabs read as too crowded on
       * mobile) — same lightweight "description + link button" shape the
       * Food list card above uses, rather than adding a new icon slot to
       * the header (which has no nav row at all on mobile today). */}
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
        <ExportSection />
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
