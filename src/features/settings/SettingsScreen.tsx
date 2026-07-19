import { Link } from 'react-router-dom'
import {
  useLocaleStore,
  useTranslation,
  type Locale,
  type Dictionary,
} from '@/i18n'
import {
  useCycleTrackingStore,
  useDigestionTrackingStore,
  useThemeStore,
  useUnitStore,
  useWeekStartStore,
  type Mood,
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
            <ToggleGroupItem value="kg">{t.common.kg}</ToggleGroupItem>
            <ToggleGroupItem value="lb">{t.common.lb}</ToggleGroupItem>
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
            <ToggleGroupItem value="monday">
              {t.settings.weekStartMonday}
            </ToggleGroupItem>
            <ToggleGroupItem value="firstEntryWeekday">
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
            <ToggleGroupItem value="en">{t.settings.english}</ToggleGroupItem>
            <ToggleGroupItem value="ru">{t.settings.russian}</ToggleGroupItem>
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
                <ToggleGroupItem key={option.value} value={option.value}>
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
              <ToggleGroupItem value="light">
                {t.settings.light}
              </ToggleGroupItem>
              <ToggleGroupItem value="dark">{t.settings.dark}</ToggleGroupItem>
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
            <ToggleGroupItem value="off">
              {t.settings.cycleTrackingOff}
            </ToggleGroupItem>
            <ToggleGroupItem value="on">
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
            <ToggleGroupItem value="off">
              {t.settings.digestionTrackingOff}
            </ToggleGroupItem>
            <ToggleGroupItem value="on">
              {t.settings.digestionTrackingOn}
            </ToggleGroupItem>
          </ToggleGroup>
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
