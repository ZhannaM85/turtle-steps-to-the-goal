import {
  useLocaleStore,
  useTranslation,
  type Locale,
  type Dictionary,
} from '@/i18n'
import { useThemeStore, type Mood } from '@/stores'
import { PageHeader } from '@/shared/ui/page-header'
import { cn } from '@/shared/lib/utils'

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
  const locale = useLocaleStore((state) => state.locale)
  const setLocale = useLocaleStore((state) => state.setLocale)
  const mood = useThemeStore((state) => state.mood)
  const setMood = useThemeStore((state) => state.setMood)
  const colorScheme = useThemeStore((state) => state.colorScheme)
  const setColorScheme = useThemeStore((state) => state.setColorScheme)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.settings.title}
        description={t.settings.description}
      />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">
          {t.settings.languageLabel}
        </legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name="locale"
              value="en"
              checked={locale === 'en'}
              onChange={() => setLocale('en' satisfies Locale)}
            />{' '}
            {t.settings.english}
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name="locale"
              value="ru"
              checked={locale === 'ru'}
              onChange={() => setLocale('ru' satisfies Locale)}
            />{' '}
            {t.settings.russian}
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">
          {t.settings.appearanceLabel}
        </legend>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">
            {t.settings.moodLabel}
          </span>
          <div className="flex flex-wrap gap-2">
            {moodOptions(t).map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm',
                  mood === option.value && 'border-ring bg-muted',
                )}
              >
                <input
                  type="radio"
                  name="mood"
                  value={option.value}
                  checked={mood === option.value}
                  onChange={() => setMood(option.value)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className="size-3.5 rounded-full"
                  style={{ background: MOOD_SWATCH[option.value] }}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">
            {t.settings.colorSchemeLabel}
          </span>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="colorScheme"
                value="light"
                checked={colorScheme === 'light'}
                onChange={() => setColorScheme('light')}
              />{' '}
              {t.settings.light}
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="colorScheme"
                value="dark"
                checked={colorScheme === 'dark'}
                onChange={() => setColorScheme('dark')}
              />{' '}
              {t.settings.dark}
            </label>
          </div>
        </div>
      </fieldset>
    </div>
  )
}
