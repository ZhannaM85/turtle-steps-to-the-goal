import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { TrendChartPeriod } from '@/domain/stats'

interface DashboardPeriodState {
  period: TrendChartPeriod
  customStart: string
  customEnd: string
  setPeriod: (period: TrendChartPeriod) => void
  setCustomStart: (date: string) => void
  setCustomEnd: (date: string) => void
}

/**
 * #380 — persists Dashboard's trend-chart period control across
 * navigation, same local-preference category/persistence shape as
 * `customChartSelectionStore`/`weekStartStore` — not part of the export
 * bundle. `'all'` default matches every trend chart's pre-#380 behavior
 * exactly for anyone who never touches this control.
 */
export const useDashboardPeriodStore = create<DashboardPeriodState>()(
  persist(
    (set) => ({
      period: 'all',
      customStart: '',
      customEnd: '',
      setPeriod: (period) => set({ period }),
      setCustomStart: (customStart) => set({ customStart }),
      setCustomEnd: (customEnd) => set({ customEnd }),
    }),
    {
      name: 'turtle-steps-dashboard-period',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
