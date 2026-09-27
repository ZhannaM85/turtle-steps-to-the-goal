import { createContext, useContext, type RefCallback } from 'react'
import type { DaySectionPinId } from '@/stores/daySectionPinStore'

/** #1022 / #1031 — sticky dock, in-flow pin order, and the kcal strip.
 * No components, so this file can export the hook beside the context. */
export interface DayPinApi {
  stripSlot: HTMLElement | null
  stripSlotRef: () => RefCallback<HTMLElement>
  /** Collapsed pins portal here (inside the sticky date header). */
  slots: Partial<Record<DaySectionPinId, HTMLElement | null>>
  slotCallback: (id: DaySectionPinId) => RefCallback<HTMLElement>
  /** Expanded pins portal here (top of the Day list, not sticky). */
  flowSlots: Partial<Record<DaySectionPinId, HTMLElement | null>>
  flowSlotCallback: (id: DaySectionPinId) => RefCallback<HTMLElement>
}

export const DayPinContext = createContext<DayPinApi | null>(null)

export function useDayPinContext(): DayPinApi | null {
  return useContext(DayPinContext)
}
