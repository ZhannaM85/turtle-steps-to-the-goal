import { registerPlugin } from '@capacitor/core'

export type HealthConnectAvailability = 'available' | 'unavailable' | 'updateRequired'

interface HealthConnectPlugin {
  getAvailability(): Promise<{ status: HealthConnectAvailability }>
  openHealthConnectInstall(): Promise<void>
  requestWeightPermission(): Promise<{ granted: boolean }>
  /** weightKg is absent (not null) when Health Connect has no weight
   * record for today — see HealthConnectPlugin.java's syncTodayWeight. */
  syncTodayWeight(): Promise<{ weightKg?: number }>
}

/**
 * #656 — thin typed wrapper around the native HealthConnectPlugin.java
 * (@CapacitorPlugin(name = "HealthConnect")). Android-only; callers gate
 * on Capacitor.getPlatform() === 'android' themselves before using this,
 * same as every other src/shared/native/ module.
 */
export const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect')
