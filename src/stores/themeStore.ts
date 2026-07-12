import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Mood = 'pond' | 'dusk' | 'sage' | 'tortoise' | 'lagoon'
export type ColorScheme = 'light' | 'dark'

export function detectDefaultColorScheme(): ColorScheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function applyTheme(mood: Mood, colorScheme: ColorScheme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.mood = mood
  document.documentElement.classList.toggle('dark', colorScheme === 'dark')
}

interface ThemeStoreState {
  mood: Mood
  colorScheme: ColorScheme
  setMood: (mood: Mood) => void
  setColorScheme: (colorScheme: ColorScheme) => void
}

export const useThemeStore = create<ThemeStoreState>()(
  persist(
    (set, get) => ({
      mood: 'pond',
      colorScheme: detectDefaultColorScheme(),
      setMood: (mood) => {
        set({ mood })
        applyTheme(mood, get().colorScheme)
      },
      setColorScheme: (colorScheme) => {
        set({ colorScheme })
        applyTheme(get().mood, colorScheme)
      },
    }),
    {
      name: 'turtle-steps-theme',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

// The inline pre-paint script in index.html already applies the persisted
// (or default) theme to <html> before this module loads, to avoid a flash
// of the wrong theme. This call keeps the DOM in sync with the store going
// forward (e.g. if localStorage was empty on first load, matching what the
// pre-paint script's own default would have computed).
applyTheme(useThemeStore.getState().mood, useThemeStore.getState().colorScheme)
