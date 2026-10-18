import { Capacitor } from '@capacitor/core'
import { Health } from '@capgo/capacitor-health'
import { addDays, endOfDay, format, parseISO, startOfDay, subDays } from 'date-fns'
import {
  aggregateSleepByWakeDay,
  aggregateWeightByDay,
  mapAggregatedStepBuckets,
  mergeAppleHealthDayReadings,
  type AppleHealthDayReading,
} from '@/features/settings/appleHealthAggregate'
import { HEALTH_CONNECT_RECENT_DAYS } from '@/features/settings/applyHealthConnectWeight'
import { AppleHealthPeriod } from '@/shared/native/appleHealthPeriod'

export type { AppleHealthDayReading }

export type AppleHealthSyncField = 'weight' | 'sleep' | 'steps'

/** #1105 — Day empty-field control: native iOS only (not web/PWA/Android). */
export function isAppleHealthDayFieldSyncAvailable(): boolean {
  return (
    Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
  )
}

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
  /**
   * #1099 — request menstrual-flow read. Default true so Cycle appears under
   * Health → Turtle Steps (matches NSHealthShareUsageDescription). Importing
   * period days into the diary still gates on Cycle tracking in Settings.
   */
  includePeriod?: boolean
}): Promise<{
  granted: boolean
  weightGranted: boolean
  sleepGranted: boolean
  stepsGranted: boolean
  periodGranted: boolean
}> {
  const includePeriod = options?.includePeriod !== false
  const status = await Health.requestAuthorization({
    read: ['weight', 'sleep', 'steps'],
  })
  const readAuthorized = status.readAuthorized ?? []
  const readDenied = status.readDenied ?? []
  const weightGranted = readAuthorized.includes('weight')
  const sleepGranted = readAuthorized.includes('sleep')
  const stepsGranted = readAuthorized.includes('steps')
  // iOS often omits denied reads from `readDenied`; treat “authorized or
  // neither listed” as ok to attempt a read (HealthKit privacy).
  const weightOk = weightGranted || !readDenied.includes('weight')
  const sleepOk = sleepGranted || !readDenied.includes('sleep')
  const stepsOk = stepsGranted || !readDenied.includes('steps')

  let periodOk = false
  if (includePeriod) {
    try {
      const period = await AppleHealthPeriod.requestAuthorization()
      periodOk = period.granted
    } catch {
      periodOk = false
    }
  }

  return {
    granted: weightOk || sleepOk || stepsOk || periodOk,
    weightGranted: weightOk,
    sleepGranted: sleepOk,
    stepsGranted: stepsOk,
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
  const windowStartIso = healthKitIso(weightStart)

  // Capgo endDate is exclusive. Prefer queryAggregated for steps (#1106) —
  // HealthKit statistics match the Health app day total (source dedupe).
  const stepsEndExclusive = addDays(startOfDay(end), 1)

  const [weightResult, sleepResult, stepsResult, periodDates] =
    await Promise.all([
      Health.readSamples({
        dataType: 'weight',
        startDate: windowStartIso,
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
      Health.queryAggregated({
        dataType: 'steps',
        startDate: windowStartIso,
        endDate: healthKitIso(stepsEndExclusive),
        bucket: 'day',
        aggregation: 'sum',
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
  const steps = mapAggregatedStepBuckets(
    (stepsResult.samples ?? []).map((s) => ({
      startDate: s.startDate,
      value: s.value,
    })),
  )

  const rangeStartKey = format(weightStart, 'yyyy-MM-dd')
  const periodInRange = periodDates.filter((date) => date >= rangeStartKey)
  return mergeAppleHealthDayReadings({
    weights,
    sleep,
    steps,
    periodDates: periodInRange,
  }).filter((row) => row.date >= rangeStartKey)
}

/** #1105 — request read for a single Day-field sync. */
export async function requestAppleHealthFieldPermission(
  field: AppleHealthSyncField,
): Promise<boolean> {
  const status = await Health.requestAuthorization({
    read: [field],
  })
  const readAuthorized = status.readAuthorized ?? []
  const readDenied = status.readDenied ?? []
  return readAuthorized.includes(field) || !readDenied.includes(field)
}

/**
 * #1105 — read one HealthKit metric for a single local calendar day.
 * Returns null when there is no sample for that field/day.
 */
export async function syncAppleHealthDayField(
  date: string,
  field: AppleHealthSyncField,
): Promise<AppleHealthDayReading | null> {
  const day = startOfDay(parseISO(date))
  const dayEnd = endOfDay(day)
  const dayEndIso = healthKitIso(dayEnd)

  if (field === 'weight') {
    const result = await Health.readSamples({
      dataType: 'weight',
      startDate: healthKitIso(day),
      endDate: dayEndIso,
      limit: 50,
      ascending: false,
    })
    const weights = aggregateWeightByDay(
      (result.samples ?? []).map((s) => ({
        startDate: s.startDate,
        value: s.value,
      })),
    ).filter((row) => row.date === date)
    return mergeAppleHealthDayReadings({ weights })[0] ?? null
  }

  if (field === 'steps') {
    // Exclusive end = start of next local day (#1106 Capgo contract).
    const result = await Health.queryAggregated({
      dataType: 'steps',
      startDate: healthKitIso(day),
      endDate: healthKitIso(addDays(day, 1)),
      bucket: 'day',
      aggregation: 'sum',
    })
    const steps = mapAggregatedStepBuckets(
      (result.samples ?? []).map((s) => ({
        startDate: s.startDate,
        value: s.value,
      })),
    ).filter((row) => row.date === date)
    return mergeAppleHealthDayReadings({ steps })[0] ?? null
  }

  // Sleep: overnight samples ending on `date` may start the previous evening.
  const sleepStart = startOfDay(subDays(day, 1))
  const result = await Health.readSamples({
    dataType: 'sleep',
    startDate: healthKitIso(sleepStart),
    endDate: dayEndIso,
    limit: 2000,
    ascending: true,
  })
  const sleep = aggregateSleepByWakeDay(
    (result.samples ?? []).map((s) => ({
      startDate: s.startDate,
      endDate: s.endDate,
      value: s.value,
      sleepState: s.sleepState,
    })),
  ).filter((row) => row.date === date)
  return mergeAppleHealthDayReadings({ sleep })[0] ?? null
}
