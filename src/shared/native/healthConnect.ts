import { registerPlugin } from '@capacitor/core'

export type HealthConnectAvailability = 'available' | 'unavailable' | 'updateRequired'

export type HealthConnectWeightReading = {
  date: string
  weightKg: number
}

interface HealthConnectPlugin {
  getAvailability(): Promise<{ status: HealthConnectAvailability }>
  openHealthConnectInstall(): Promise<void>
  requestWeightPermission(): Promise<{ granted: boolean }>
  /** weightKg is absent (not null) when Health Connect has no weight
   * record for today — see HealthConnectPlugin.java's syncTodayWeight. */
  syncTodayWeight(): Promise<{ weightKg?: number }>
  /** #694 — latest weight per local day over a recent window (default 7). */
  syncRecentWeights(options?: {
    days?: number
  }): Promise<{ weights: HealthConnectWeightReading[] }>
}

/**
 * #656 / #694 — thin typed wrapper around the native HealthConnectPlugin.java
 * (@CapacitorPlugin(name = "HealthConnect")). Android-only; callers gate
 * on Capacitor.getPlatform() === 'android' themselves before using this,
 * same as every other src/shared/native/ module.
 */
export const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect')
