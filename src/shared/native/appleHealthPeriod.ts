import { registerPlugin } from '@capacitor/core'

/**
 * #1099 — iOS-only menstrual-flow read (Capgo has no period data type).
 * Implementation: `ios/App/App/AppleHealthPeriodPlugin.swift`.
 */
interface AppleHealthPeriodPlugin {
  requestAuthorization(): Promise<{ granted: boolean }>
  syncRecentPeriodDays(options?: {
    days?: number
  }): Promise<{ dates: string[] }>
}

export const AppleHealthPeriod = registerPlugin<AppleHealthPeriodPlugin>(
  'AppleHealthPeriod',
)
