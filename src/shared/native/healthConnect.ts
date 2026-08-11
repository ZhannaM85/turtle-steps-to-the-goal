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

export type HealthConnectSleepReading = {
  date: string
  sleepHours: number
  deepSleepHours?: number
}

interface HealthConnectPlugin {
  getAvailability(): Promise<{ status: HealthConnectAvailability }>
  openHealthConnectInstall(): Promise<void>
  /** #656 / #657 / #658 — requests weight + steps + sleep; `granted` if any. */
  requestWeightPermission(): Promise<{
    granted: boolean
    weightGranted?: boolean
    stepsGranted?: boolean
    sleepGranted?: boolean
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
  /** #658 — sleep hours per wake-up day over a recent window (default 7). */
  syncRecentSleep(options?: {
    days?: number
  }): Promise<{ sleep: HealthConnectSleepReading[] }>
}

/**
 * Thin typed wrapper around HealthConnectPlugin.java. Android-only; callers
 * gate on Capacitor.getPlatform() === 'android' themselves.
 */
export const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect')
