import { registerPlugin } from '@capacitor/core'

export type HealthConnectAvailability = 'available' | 'unavailable' | 'updateRequired'

export type HealthConnectWeightReading = {
  date: string
  weightKg: number
}

export type HealthConnectStepsReading = {
  date: string
  steps: number
}

interface HealthConnectPlugin {
  getAvailability(): Promise<{ status: HealthConnectAvailability }>
  openHealthConnectInstall(): Promise<void>
  /** #656 / #657 — requests READ_WEIGHT + READ_STEPS; `granted` if either. */
  requestWeightPermission(): Promise<{
    granted: boolean
    weightGranted?: boolean
    stepsGranted?: boolean
  }>
  /** weightKg is absent (not null) when Health Connect has no weight
   * record for today — see HealthConnectPlugin.java's syncTodayWeight. */
  syncTodayWeight(): Promise<{ weightKg?: number }>
  /** #694 — latest weight per local day over a recent window (default 7). */
  syncRecentWeights(options?: {
    days?: number
  }): Promise<{ weights: HealthConnectWeightReading[] }>
  /** #657 — summed steps per local day over a recent window (default 7). */
  syncRecentSteps(options?: {
    days?: number
  }): Promise<{ steps: HealthConnectStepsReading[] }>
}

/**
 * #656 / #694 / #657 — thin typed wrapper around the native
 * HealthConnectPlugin.java (@CapacitorPlugin(name = "HealthConnect")).
 * Android-only; callers gate on Capacitor.getPlatform() === 'android'
 * themselves before using this, same as every other src/shared/native/ module.
 */
export const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect')
