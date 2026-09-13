import { Link } from 'react-router-dom'
import {
  useLocaleStore,
  useTranslation,
  type Dictionary,
  type Locale,
} from '@/i18n'
import {
  useDayStartStore,
  useThemeStore,
  useUnitStore,
  useWeekStartStore,
  type ColorScheme,
  type Mood,
  type Unit,
  type WeekStart,
} from '@/stores'
import { Button } from '@/shared/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { TimeInput } from '@/shared/ui/time-input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { SettingsMealSlotTimesSection } from './SettingsMealSlotTimesSection'
import { SettingsPinnableCard } from './SettingsPinnableCard'

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

export function SettingsBasicsCards() {
  const t = useTranslation()
  const unit = useUnitStore((state) => state.unit)
  const setUnit = useUnitStore((state) => state.setUnit)
  const locale = useLocaleStore((state) => state.locale)
  const setLocale = useLocaleStore((state) => state.setLocale)
  const mood = useThemeStore((state) => state.mood)
  const setMood = useThemeStore((state) => state.setMood)
  const colorScheme = useThemeStore((state) => state.colorScheme)
  const setColorScheme = useThemeStore((state) => state.setColorScheme)
  const dayStartTime = useDayStartStore((state) => state.dayStartTime)
  const setDayStartTime = useDayStartStore((state) => state.setDayStartTime)
  const weekStart = useWeekStartStore((state) => state.weekStart)
  const setWeekStart = useWeekStartStore((state) => state.setWeekStart)

  return (
    <>
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

      <SettingsMealSlotTimesSection />

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
    </>
  )
}
