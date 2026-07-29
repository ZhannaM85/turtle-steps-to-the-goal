import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Mood = 'pond' | 'dusk' | 'sage' | 'tortoise' | 'lagoon'
/** #402 — 'system' live-tracks the OS's own `prefers-color-scheme` instead
 * of a one-time snapshot of it; 'light'/'dark' are an explicit manual
 * pick that ignores the OS entirely. */
export type ColorScheme = 'light' | 'dark' | 'system'

export function detectDefaultColorScheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/** Resolves 'system' to whatever the OS currently reports; 'light'/'dark'
 * pass through unchanged. */
export function resolveColorScheme(colorScheme: ColorScheme): 'light' | 'dark' {
  return colorScheme === 'system' ? detectDefaultColorScheme() : colorScheme
}

export function applyTheme(mood: Mood, colorScheme: ColorScheme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.mood = mood
  document.documentElement.classList.toggle(
    'dark',
    resolveColorScheme(colorScheme) === 'dark',
  )
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
      // New users (nothing in localStorage yet) default to 'system' rather
      // than a hard light/dark snapshot — an existing persisted 'light'/
      // 'dark' pick from before this option existed is untouched by this
      // default, since zustand's persist middleware only ever falls back
      // to the in-memory initial state before hydration overrides it.
      colorScheme: 'system',
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

// #402 — live-tracks the OS preference while 'system' is selected, instead
// of only reading it once at load. A manual 'light'/'dark' pick ignores
// this listener entirely (the guard below is the only thing gating it).
if (typeof window !== 'undefined' && window.matchMedia) {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      const state = useThemeStore.getState()
      if (state.colorScheme === 'system') {
        applyTheme(state.mood, state.colorScheme)
      }
    })
}
