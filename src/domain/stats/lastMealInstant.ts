import {
  OVERNIGHT_WRAP_BEFORE_MINUTES,
  adjustForDayStart,
} from '@/domain/stats/dayStart'
import {
  effectiveTimeEaten,
  type MealSlotDefaultTimes,
} from '@/shared/lib/mealLabel'

type MealWithTime = {
  timeEaten?: string
  label?: string | number
}

function timeToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Clock (HH:MM) of the latest meal on a day, using recorded `timeEaten`
 * or the slot default (#580), day-start-adjusted so a 01:00 tail sorts
 * after the evening it followed.
 */
export function lastMealClock(
  entries: readonly MealWithTime[],
  slotTimes?: MealSlotDefaultTimes,
): string | null {
  let best: { clock: string; adjusted: number } | null = null
  for (const meal of entries) {
    const clock = effectiveTimeEaten(meal, slotTimes)
    if (!clock) continue
    const adjusted = adjustForDayStart(timeToMinutes(clock))
    if (!best || adjusted > best.adjusted) best = { clock, adjusted }
  }
  return best?.clock ?? null
}

/**
 * Local Date for a meal's HH:MM on `dateIso`. Clocks before 06:00 are the
 * late-night tail of that entry, so they belong to the next calendar day —
 * same wrap as `adjustForDayStart`.
 */
export function clockOnDayToDate(dateIso: string, hhmm: string): Date {
  const [year, month, day] = dateIso.split('-').map(Number)
  const [hours, minutes] = hhmm.split(':').map(Number)
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0)
  const mealMinutes = hours * 60 + minutes
  if (mealMinutes < OVERNIGHT_WRAP_BEFORE_MINUTES) {
    date.setDate(date.getDate() + 1)
  }
  return date
}

export interface ResolveLastMealInstantArgs {
  todayDate: string
  todayEntries: readonly MealWithTime[]
  previousDate: string
  previousEntries: readonly MealWithTime[] | undefined
  slotTimes?: MealSlotDefaultTimes
}

/**
 * #791 — instant of the most recent meal: today's last timed meal, or
 * yesterday's last if today has none (overnight fast).
 */
export function resolveLastMealInstant({
  todayDate,
  todayEntries,
  previousDate,
  previousEntries,
  slotTimes,
}: ResolveLastMealInstantArgs): Date | null {
  const todayClock = lastMealClock(todayEntries, slotTimes)
  if (todayClock) {
    return clockOnDayToDate(todayDate, todayClock)
  }
  if (!previousEntries) return null
  const previousClock = lastMealClock(previousEntries, slotTimes)
  if (!previousClock) return null
  return clockOnDayToDate(previousDate, previousClock)
}

/**
 * #792 — hours+minutes from the previous timed meal to this one, in
 * display order. The first meal of the day uses yesterday's last meal
 * (overnight fast). Untimed meals get `null` and are skipped as a
 * predecessor.
 */
export function gapsSincePreviousMeal(
  meals: readonly MealWithTime[],
  dateIso: string,
  previousDate: string,
  previousEntries: readonly MealWithTime[] | undefined,
  slotTimes?: MealSlotDefaultTimes,
): (ElapsedParts | null)[] {
  const yesterdayClock = previousEntries
    ? lastMealClock(previousEntries, slotTimes)
    : null
  const yesterdayInstant = yesterdayClock
    ? clockOnDayToDate(previousDate, yesterdayClock)
    : null

  const instants: (Date | null)[] = meals.map((meal) => {
    const clock = effectiveTimeEaten(meal, slotTimes)
    if (!clock) return null
    return clockOnDayToDate(dateIso, clock)
  })

  return instants.map((thisInstant, index) => {
    if (!thisInstant) return null
    let previous: Date | null = null
    for (let i = index - 1; i >= 0; i--) {
      if (instants[i]) {
        previous = instants[i]
        break
      }
    }
    if (!previous) previous = yesterdayInstant
    if (!previous) return null
    return elapsedParts(previous, thisInstant)
  })
}

export interface ElapsedParts {
  hours: number
  minutes: number
  seconds: number
}

/** Wall-clock elapsed from `from` to `now`; never negative. */
export function elapsedParts(from: Date, now: Date): ElapsedParts {
  const ms = Math.max(0, now.getTime() - from.getTime())
  const totalSec = Math.floor(ms / 1000)
  return {
    hours: Math.floor(totalSec / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  }
}
