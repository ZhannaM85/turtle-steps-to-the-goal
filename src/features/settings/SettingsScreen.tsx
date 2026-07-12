import { useLocaleStore, useTranslation, type Locale } from '@/i18n'
import { PageHeader } from '@/shared/ui/page-header'

export function SettingsScreen() {
  const t = useTranslation()
  const locale = useLocaleStore((state) => state.locale)
  const setLocale = useLocaleStore((state) => state.setLocale)

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
    </div>
  )
}
