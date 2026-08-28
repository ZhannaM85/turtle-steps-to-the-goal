import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { isBuiltInEatingReason, type EatingReason } from '@/domain/dailyEntry'
import type { EatingReasonLabelOverrides } from '@/shared/lib/eatingReasonDisplay'

const MAX_CUSTOM_EATING_REASON_LENGTH = 80

/**
 * #764 — opt-in "Why am I eating?" on Add meal. Off by default.
 * #765 — user-authored extra reasons, shown in the same dropdown.
 * #766 — optional display-label overrides for the built-in reasons.
 * #769 — HALT built-ins (Hungry / Angry / Lonely / Tired).
 * Local UI preference only (the on/off switch is not in the export
 * bundle); logged `eatingReason` values still travel with JSON backups,
 * and the custom *list* plus builtin overrides are included in the
 * settings blob like meal-name presets.
 */
interface EatingReasonTrackingStoreState {
  enabled: boolean
  customReasons: string[]
  builtinLabelOverrides: EatingReasonLabelOverrides
  setEnabled: (enabled: boolean) => void
  addCustomReason: (label: string) => void
  removeCustomReason: (label: string) => void
  renameCustomReason: (from: string, to: string) => void
  setBuiltinLabelOverride: (
    reason: EatingReason,
    label: string | undefined,
  ) => void
}

function normalizeCustomEatingReason(label: string): string | undefined {
  const trimmed = label.trim()
  if (!trimmed) return undefined
  if (trimmed.length > MAX_CUSTOM_EATING_REASON_LENGTH) {
    return trimmed.slice(0, MAX_CUSTOM_EATING_REASON_LENGTH).trim()
  }
  return trimmed
}

export const useEatingReasonTrackingStore =
  create<EatingReasonTrackingStoreState>()(
    persist(
      (set) => ({
        enabled: false,
        customReasons: [],
        builtinLabelOverrides: {},
        setEnabled: (enabled) => set({ enabled }),
        addCustomReason: (label) =>
          set((state) => {
            const trimmed = normalizeCustomEatingReason(label)
            if (!trimmed) return state
            if (isBuiltInEatingReason(trimmed.toLowerCase())) return state
            if (
              state.customReasons.some(
                (reason) => reason.toLowerCase() === trimmed.toLowerCase(),
              )
            ) {
              return state
            }
            return { customReasons: [...state.customReasons, trimmed] }
          }),
        removeCustomReason: (label) =>
          set((state) => ({
            customReasons: state.customReasons.filter(
              (reason) => reason !== label,
            ),
          })),
        renameCustomReason: (from, to) =>
          set((state) => {
            const trimmed = normalizeCustomEatingReason(to)
            if (!trimmed || trimmed === from) return state
            if (isBuiltInEatingReason(trimmed.toLowerCase())) return state
            if (!state.customReasons.includes(from)) return state
            if (
              state.customReasons.some(
                (reason) =>
                  reason !== from &&
                  reason.toLowerCase() === trimmed.toLowerCase(),
              )
            ) {
              return state
            }
            return {
              customReasons: state.customReasons.map((reason) =>
                reason === from ? trimmed : reason,
              ),
            }
          }),
        setBuiltinLabelOverride: (reason, label) =>
          set((state) => {
            const next = { ...state.builtinLabelOverrides }
            const trimmed = label?.trim()
            if (!trimmed) {
              delete next[reason]
            } else {
              next[reason] =
                trimmed.length > MAX_CUSTOM_EATING_REASON_LENGTH
                  ? trimmed.slice(0, MAX_CUSTOM_EATING_REASON_LENGTH).trim()
                  : trimmed
            }
            return { builtinLabelOverrides: next }
          }),
      }),
      {
        name: 'turtle-steps-eating-reason-tracking',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  )
