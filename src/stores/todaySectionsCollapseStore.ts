import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** Top-level Day / Today accordion shells (#511) — not nested UI. */
export type TodaySectionKey =
  | 'morning'
  | 'stats'
  | 'macros'
  | 'dayTotals'
  | 'meals'
  | 'plannedMeals'
  | 'water'
  | 'customMetrics'
  | 'evening'

export const TODAY_SECTION_KEYS: TodaySectionKey[] = [
  'morning',
  'stats',
  'macros',
  'dayTotals',
  'meals',
  'plannedMeals',
  'water',
  'customMetrics',
  'evening',
]

const DEFAULT_SECTIONS: Record<TodaySectionKey, boolean> = {
  morning: false,
  stats: false,
  macros: false,
  dayTotals: false,
  meals: false,
  plannedMeals: false,
  water: false,
  customMetrics: false,
  evening: false,
}

interface TodaySectionsCollapseState {
  /** `true` = that section's accordion is collapsed. */
  sections: Record<TodaySectionKey, boolean>
  setCollapsed: (key: TodaySectionKey, collapsed: boolean) => void
  collapseAll: () => void
  expandAll: () => void
}

/**
 * #511 — one source of truth for every top-level Day section accordion
 * (Morning / Stats / macros / meals / water / custom metrics / Evening).
 * Persisted so a Collapse-all (or a single-section hide) sticks across
 * visits — same reasoning #418's Stats-only store used, expanded to the
 * full set. Replaces `todayStatsCollapseStore` (`turtle-steps-today-stats-
 * collapse`); first load copies that key's `collapsed` into `stats` when
 * present, then drops the old key.
 */
function seedSectionsFromLegacyStatsStore(): Record<TodaySectionKey, boolean> {
  const sections = { ...DEFAULT_SECTIONS }
  try {
    const raw = localStorage.getItem('turtle-steps-today-stats-collapse')
    if (!raw) return sections
    const parsed = JSON.parse(raw) as { state?: { collapsed?: unknown } }
    if (typeof parsed.state?.collapsed === 'boolean') {
      sections.stats = parsed.state.collapsed
    }
    localStorage.removeItem('turtle-steps-today-stats-collapse')
  } catch {
    // Corrupt / unavailable storage — keep defaults.
  }
  return sections
}

export const useTodaySectionsCollapseStore =
  create<TodaySectionsCollapseState>()(
    persist(
      (set) => ({
        sections: seedSectionsFromLegacyStatsStore(),
        setCollapsed: (key, collapsed) =>
          set((state) => ({
            sections: { ...state.sections, [key]: collapsed },
          })),
        collapseAll: () =>
          set({
            sections: Object.fromEntries(
              TODAY_SECTION_KEYS.map((key) => [key, true]),
            ) as Record<TodaySectionKey, boolean>,
          }),
        expandAll: () =>
          set({
            sections: { ...DEFAULT_SECTIONS },
          }),
      }),
      {
        name: 'turtle-steps-today-sections-collapse',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  )

/** True when at least one of `keys` is currently expanded. */
export function anyTodaySectionExpanded(
  sections: Record<TodaySectionKey, boolean>,
  keys: readonly TodaySectionKey[],
): boolean {
  return keys.some((key) => !sections[key])
}
