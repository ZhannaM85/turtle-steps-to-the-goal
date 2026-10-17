import { Capacitor } from '@capacitor/core'
import { Health } from '@capgo/capacitor-health'
import { format, startOfDay, subDays } from 'date-fns'
import {
  aggregateSleepByWakeDay,
  aggregateWeightByDay,
  mergeAppleHealthDayReadings,
  type AppleHealthDayReading,
} from '@/features/settings/appleHealthAggregate'
import { HEALTH_CONNECT_RECENT_DAYS } from '@/features/settings/applyHealthConnectWeight'
import { AppleHealthPeriod } from '@/shared/native/appleHealthPeriod'

export type { AppleHealthDayReading }

/**
 * Capgo HealthKit uses `ISO8601DateFormatter` with `.withFractionalSeconds`,
 * so dates without a fractional part (e.g. date-fns `formatISO`) are rejected
 * as invalid and Sync fails with a generic error.
 */
function healthKitIso(date: Date): string {
  return date.toISOString()
}

/**
 * #1098 — iOS HealthKit via `@capgo/capacitor-health`. Callers gate on
 * `Capacitor.getPlatform() === 'ios'`.
 */
export async function getAppleHealthAvailability(): Promise<
  'available' | 'unavailable'
> {
  if (Capacitor.getPlatform() !== 'ios') return 'unavailable'
  try {
    const { available } = await Health.isAvailable()
    return available ? 'available' : 'unavailable'
  } catch {
    return 'unavailable'
  }
}

export async function requestAppleHealthPermissions(options?: {
  /** #1099 — also request menstrual-flow when Cycle tracking is on. */
  includePeriod?: boolean
}): Promise<{
  granted: boolean
  weightGranted: boolean
  sleepGranted: boolean
  periodGranted: boolean
}> {
  const status = await Health.requestAuthorization({
    read: ['weight', 'sleep'],
  })
  const readAuthorized = status.readAuthorized ?? []
  const readDenied = status.readDenied ?? []
  const weightGranted = readAuthorized.includes('weight')
  const sleepGranted = readAuthorized.includes('sleep')
  // iOS often omits denied reads from `readDenied`; treat “authorized or
  // neither listed” as ok to attempt a read (HealthKit privacy).
  const weightOk = weightGranted || !readDenied.includes('weight')
  const sleepOk = sleepGranted || !readDenied.includes('sleep')

  let periodOk = false
  if (options?.includePeriod) {
    try {
      const period = await AppleHealthPeriod.requestAuthorization()
      periodOk = period.granted
    } catch {
      periodOk = false
    }
  }

  return {
    granted: weightOk || sleepOk || periodOk,
    weightGranted: weightOk,
    sleepGranted: sleepOk,
    periodGranted: periodOk,
  }
}

export async function syncRecentAppleHealth(options?: {
  days?: number
  includePeriod?: boolean
}): Promise<AppleHealthDayReading[]> {
  const days = Math.max(1, options?.days ?? HEALTH_CONNECT_RECENT_DAYS)
  const end = new Date()
  const weightStart = startOfDay(subDays(end, days - 1))
  // Overnight sleep that ends on `weightStart` began the previous evening.
  const sleepStart = startOfDay(subDays(end, days))
  const endIso = healthKitIso(end)

  const [weightResult, sleepResult, periodDates] = await Promise.all([
    Health.readSamples({
      dataType: 'weight',
      startDate: healthKitIso(weightStart),
      endDate: endIso,
      limit: 1000,
      ascending: false,
    }),
    Health.readSamples({
      dataType: 'sleep',
      startDate: healthKitIso(sleepStart),
      endDate: endIso,
      limit: 5000,
      ascending: true,
    }),
    options?.includePeriod
      ? AppleHealthPeriod.syncRecentPeriodDays({ days })
          .then((r) => r.dates ?? [])
          .catch(() => [] as string[])
      : Promise.resolve([] as string[]),
  ])

  const weights = aggregateWeightByDay(
    (weightResult.samples ?? []).map((s) => ({
      startDate: s.startDate,
      value: s.value,
    })),
  )
  const sleep = aggregateSleepByWakeDay(
    (sleepResult.samples ?? []).map((s) => ({
      startDate: s.startDate,
      endDate: s.endDate,
      value: s.value,
      sleepState: s.sleepState,
    })),
  )

  const rangeStartKey = format(weightStart, 'yyyy-MM-dd')
  const periodInRange = periodDates.filter((date) => date >= rangeStartKey)
  return mergeAppleHealthDayReadings(weights, sleep, periodInRange).filter(
    (row) => row.date >= rangeStartKey,
  )
}
