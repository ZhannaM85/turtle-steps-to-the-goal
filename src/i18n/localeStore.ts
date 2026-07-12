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

interface LocaleStoreState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleStoreState>()(
  persist(
    (set) => ({
      locale: detectDefaultLocale(),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'turtle-steps-locale',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

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
