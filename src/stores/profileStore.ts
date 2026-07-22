import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ActivityLevel, Sex } from '@/domain/stats'

/**
 * Height/age/sex (#233) — one-time-ish profile settings, not a daily
 * entry, entered purely to compute BMI/BMR. Local UI preference, same
 * category as unit/theme/week-start (not part of the export bundle) —
 * consistent with every other Zustand-only preference in this app; the
 * *computed* BMI/BMR numbers aren't stored anywhere either, they're
 * recalculated from this plus the day's own logged weight.
 *
 * `activityLevel` (#259) — added alongside the others for the "Suggest a
 * target" TDEE helper on GoalForm; same local-only, optional, not-in-
 * backups treatment. Deliberately reuses this existing profile concept
 * rather than introducing a second one, per #259's own "where these live
 * is an implementation decision" note.
 */
export type { ActivityLevel, Sex }

interface ProfileStoreState {
  heightCm: number | undefined
  age: number | undefined
  sex: Sex | undefined
  activityLevel: ActivityLevel | undefined
  setHeightCm: (heightCm: number | undefined) => void
  setAge: (age: number | undefined) => void
  setSex: (sex: Sex | undefined) => void
  setActivityLevel: (activityLevel: ActivityLevel | undefined) => void
}

export const useProfileStore = create<ProfileStoreState>()(
  persist(
    (set) => ({
      heightCm: undefined,
      age: undefined,
      sex: undefined,
      activityLevel: undefined,
      setHeightCm: (heightCm) => set({ heightCm }),
      setAge: (age) => set({ age }),
      setSex: (sex) => set({ sex }),
      setActivityLevel: (activityLevel) => set({ activityLevel }),
    }),
    {
      name: 'turtle-steps-profile',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
