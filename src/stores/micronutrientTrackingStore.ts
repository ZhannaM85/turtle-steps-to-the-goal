import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * #530 — which electrolytes appear in meal entry, Goal targets, Today
 * Remaining cards, and the Dashboard electrolytes chart. All default
 * off (opt-in); turning a nutrient off only hides UI going forward —
 * already-logged mg values on meals stay in storage.
 */
export type MicronutrientField = 'sodium' | 'potassium' | 'magnesium'

const DEFAULT_TRACKED: Record<MicronutrientField, boolean> = {
  sodium: false,
  potassium: false,
  magnesium: false,
}

interface MicronutrientTrackingState {
  tracked: Record<MicronutrientField, boolean>
  setTracked: (field: MicronutrientField, value: boolean) => void
}

export const useMicronutrientTrackingStore =
  create<MicronutrientTrackingState>()(
    persist(
      (set) => ({
        tracked: DEFAULT_TRACKED,
        setTracked: (field, value) =>
          set((state) => ({
            tracked: { ...state.tracked, [field]: value },
          })),
      }),
      {
        name: 'turtle-steps-micronutrient-tracking',
        storage: createJSONStorage(() => localStorage),
        merge: (persisted, current) => {
          const p = persisted as Partial<MicronutrientTrackingState> | undefined
          return {
            ...current,
            ...p,
            tracked: {
              ...DEFAULT_TRACKED,
              ...p?.tracked,
            },
          }
        },
      },
    ),
  )
