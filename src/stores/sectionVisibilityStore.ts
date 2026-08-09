import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** #232 — whole-section show/hide for Today's and Goal's computed/insight
 * sections, the same mechanism #245/#247 already gave every Dashboard
 * section (`dashboardChartVisibilityStore.ts`) — kept as a separate store
 * since this covers different pages with a different key set, not
 * because the underlying idea differs. Deliberately does NOT cover the
 * raw input fields #237 already made toggleable (Sleep/Steps/Body
 * measurements/Note/Mood) — this is "computed insight" sections only,
 * matching #232's own text distinguishing itself from #237. */
export type SectionKey =
  | 'todayWeeklyTarget'
  | 'todayVsYesterday'
  | 'todayVsMaxWeight'
  | 'todayRemainingCalories'
  | 'todayRemainingProtein'
  | 'todayRemainingFat'
  | 'todayRemainingCarbs'
  | 'todayRemainingFiber'
  | 'todayRemainingSodium'
  | 'todayRemainingPotassium'
  | 'todayRemainingMagnesium'
  | 'todayRemainingWater'
  | 'todaySteps'
  | 'todaySleep'
  | 'todayTargetMetBanner'
  | 'todayGoalRenewalReminder'
  | 'todayDailyReminder'
  | 'todayNutritionFacts'
  | 'todayBmi'
  | 'goalWeeklyTargetCard'
  | 'goalReachedNudge'
  | 'goalPastTargets'
  | 'goalPaceCheckNudge'

const DEFAULT_VISIBLE: Record<SectionKey, boolean> = {
  todayWeeklyTarget: true,
  todayVsYesterday: true,
  todayVsMaxWeight: true,
  todayRemainingCalories: true,
  todayRemainingProtein: true,
  todayRemainingFat: true,
  todayRemainingCarbs: true,
  todayRemainingFiber: true,
  todayRemainingSodium: true,
  todayRemainingPotassium: true,
  todayRemainingMagnesium: true,
  todayRemainingWater: true,
  todaySteps: true,
  todaySleep: true,
  todayTargetMetBanner: true,
  todayGoalRenewalReminder: true,
  todayDailyReminder: true,
  todayNutritionFacts: true,
  todayBmi: true,
  goalWeeklyTargetCard: true,
  goalReachedNudge: true,
  goalPastTargets: true,
  goalPaceCheckNudge: true,
}

interface SectionVisibilityState {
  visible: Record<SectionKey, boolean>
  toggleVisible: (section: SectionKey) => void
}

export const useSectionVisibilityStore = create<SectionVisibilityState>()(
  persist(
    (set) => ({
      visible: DEFAULT_VISIBLE,
      toggleVisible: (section) =>
        set((state) => ({
          visible: { ...state.visible, [section]: !state.visible[section] },
        })),
    }),
      {
        name: 'turtle-steps-section-visibility',
        storage: createJSONStorage(() => localStorage),
        merge: (persisted, current) => {
          const p = persisted as Partial<SectionVisibilityState> | undefined
          return {
            ...current,
            ...p,
            visible: {
              ...DEFAULT_VISIBLE,
              ...p?.visible,
            },
          }
        },
      },
  ),
)
