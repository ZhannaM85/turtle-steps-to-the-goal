import { createContext, useContext, type RefCallback } from 'react'
import type { DaySectionPinId } from '@/stores/daySectionPinStore'

/** #1022 — shared by the sticky dock and the kcal strip. No components,
 * so this file can export the hook beside the context. */
export interface DayPinApi {
  stripSlot: HTMLElement | null
  stripSlotRef: () => RefCallback<HTMLElement>
  slots: Partial<Record<DaySectionPinId, HTMLElement | null>>
  slotCallback: (id: DaySectionPinId) => RefCallback<HTMLElement>
}

export const DayPinContext = createContext<DayPinApi | null>(null)

export function useDayPinContext(): DayPinApi | null {
  return useContext(DayPinContext)
}
