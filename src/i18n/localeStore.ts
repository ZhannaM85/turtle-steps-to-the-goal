import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Dictionary } from './Dictionary'
import { en } from './en'
import { ru } from './ru'

export type Locale = 'en' | 'ru'

const dictionaries: Record<Locale, Dictionary> = { en, ru }

export function detectDefaultLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en'
  return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

/** `#882` — keep `<html lang>` in sync with Settings, not the hardcoded `en`. */
export function applyDocumentLang(locale: Locale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
}

interface LocaleStoreState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleStoreState>()(
  persist(
    (set) => ({
      locale: detectDefaultLocale(),
      setLocale: (locale) => {
        applyDocumentLang(locale)
        set({ locale })
      },
    }),
    {
      name: 'turtle-steps-locale',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        applyDocumentLang(state?.locale ?? detectDefaultLocale())
      },
    },
  ),
)

applyDocumentLang(useLocaleStore.getState().locale)
useLocaleStore.subscribe((state) => {
  applyDocumentLang(state.locale)
})

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}

export function useTranslation(): Dictionary {
  const locale = useLocaleStore((state) => state.locale)
  return dictionaries[locale]
}

export function useLocale(): Locale {
  return useLocaleStore((state) => state.locale)
}
