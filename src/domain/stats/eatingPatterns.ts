import type { DailyEntry } from '@/domain/dailyEntry'
import {
  calorieEntryCarbs,
  calorieEntryKcal,
  mealEatingReasons,
} from '@/domain/dailyEntry'
import { effectiveTimeEaten, type MealSlotDefaultTimes } from '@/shared/lib/mealLabel'
import { clockOnDayToDate } from './lastMealInstant'
import { mealTimeBucket, type MealTimeBucket } from './mealTimeBuckets'

/** Enough consecutive timed meals for a split to mean anything (#823). */
export const MIN_EATING_PATTERN_PAIRS = 8
const MIN_GROUP_SIZE = 4
/** Ignore a carb-gap insight if the two means are closer than this. */
const MIN_GAP_DIFF_MINUTES = 15

export interface EatingEpisodeLink {
  fromDate: string
  fromTime: string
  fromBucket: MealTimeBucket
  fromKcal: number
  fromCarbsG: number | undefined
  carbPercent: number | undefined
  minutesToNext: number
  nextDate: string
  nextTime: string
  nextBucket: MealTimeBucket
  nextReasons: string[]
}

export type EatingPatternInsight =
  | {
      kind: 'carbGap'
      sampleSize: number
      higherCarbMinutes: number
      lowerCarbMinutes: number
      higherN: number
      lowerN: number
      nextCravingCount: number
      nextReasonedCount: number
    }
  | {
      kind: 'eveningToNight'
      sampleSize: number
      eveningCount: number
      eveningThenNightCount: number
      averageMinutes: number
      topNextReason: string | undefined
      topNextReasonCount: number
    }

interface TimedEpisode {
  date: string
  clock: string
  bucket: MealTimeBucket
  instant: Date
  kcal: number
  carbsG: number | undefined
  reasons: string[]
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2
}

function mostCommonReason(reasons: string[]): {
  reason: string
  count: number
} | null {
  if (reasons.length === 0) return null
  const counts = new Map<string, number>()
  for (const reason of reasons) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1)
  }
  let best: { reason: string; count: number } | null = null
  for (const [reason, count] of counts) {
    if (!best || count > best.count) best = { reason, count }
  }
  return best
}

function carbPercent(kcal: number, carbsG: number | undefined): number | undefined {
  if (kcal <= 0 || carbsG === undefined) return undefined
  return ((carbsG * 4) / kcal) * 100
}

function episodesFromEntries(
  entries: DailyEntry[],
  dayStartTime: string,
  slotTimes?: MealSlotDefaultTimes,
): TimedEpisode[] {
  const episodes: TimedEpisode[] = []
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  for (const entry of sorted) {
    for (const meal of entry.calorieEntries ?? []) {
      const clock = effectiveTimeEaten(meal, slotTimes)
      if (!clock) continue
      episodes.push({
        date: entry.date,
        clock,
        bucket: mealTimeBucket(clock),
        instant: clockOnDayToDate(entry.date, clock, dayStartTime),
        kcal: calorieEntryKcal(meal),
        carbsG: calorieEntryCarbs(meal),
        reasons: mealEatingReasons(meal),
      })
    }
  }
  episodes.sort((a, b) => a.instant.getTime() - b.instant.getTime())
  return episodes
}

/**
 * Consecutive timed eating episodes (#823). The gap is time until the
 * next logged meal, never invented hunger.
 */
export function eatingEpisodeLinks(
  entries: DailyEntry[],
  dayStartTime = '00:00',
  slotTimes?: MealSlotDefaultTimes,
): EatingEpisodeLink[] {
  const episodes = episodesFromEntries(entries, dayStartTime, slotTimes)
  const links: EatingEpisodeLink[] = []
  for (let i = 0; i < episodes.length - 1; i++) {
    const from = episodes[i]!
    const next = episodes[i + 1]!
    const minutesToNext =
      (next.instant.getTime() - from.instant.getTime()) / 60_000
    if (minutesToNext <= 0) continue
    links.push({
      fromDate: from.date,
      fromTime: from.clock,
      fromBucket: from.bucket,
      fromKcal: from.kcal,
      fromCarbsG: from.carbsG,
      carbPercent: carbPercent(from.kcal, from.carbsG),
      minutesToNext,
      nextDate: next.date,
      nextTime: next.clock,
      nextBucket: next.bucket,
      nextReasons: next.reasons,
    })
  }
  return links
}

function carbGapInsight(
  links: EatingEpisodeLink[],
  includeReasons: boolean,
): Extract<EatingPatternInsight, { kind: 'carbGap' }> | null {
  const withCarbs = links.filter((link) => link.carbPercent !== undefined)
  if (withCarbs.length < MIN_EATING_PATTERN_PAIRS) return null
  const threshold = median(withCarbs.map((link) => link.carbPercent!))
  const higher = withCarbs.filter((link) => link.carbPercent! >= threshold)
  const lower = withCarbs.filter((link) => link.carbPercent! < threshold)
  if (higher.length < MIN_GROUP_SIZE || lower.length < MIN_GROUP_SIZE) {
    return null
  }
  const higherCarbMinutes = mean(higher.map((link) => link.minutesToNext))
  const lowerCarbMinutes = mean(lower.map((link) => link.minutesToNext))
  if (Math.abs(higherCarbMinutes - lowerCarbMinutes) < MIN_GAP_DIFF_MINUTES) {
    return null
  }
  const reasoned = higher.filter((link) => link.nextReasons.length > 0)
  const nextCravingCount = reasoned.filter((link) =>
    link.nextReasons.includes('craving'),
  ).length
  return {
    kind: 'carbGap',
    sampleSize: withCarbs.length,
    higherCarbMinutes,
    lowerCarbMinutes,
    higherN: higher.length,
    lowerN: lower.length,
    nextCravingCount: includeReasons ? nextCravingCount : 0,
    nextReasonedCount: includeReasons ? reasoned.length : 0,
  }
}

function eveningToNightInsight(
  links: EatingEpisodeLink[],
  includeReasons: boolean,
): Extract<EatingPatternInsight, { kind: 'eveningToNight' }> | null {
  const evening = links.filter((link) => link.fromBucket === 'evening')
  if (evening.length < MIN_GROUP_SIZE) return null
  const eveningThenNight = evening.filter((link) => link.nextBucket === 'night')
  if (eveningThenNight.length === 0) return null
  if (eveningThenNight.length / evening.length < 0.5) return null
  const nightReasons = eveningThenNight.flatMap((link) => link.nextReasons)
  const top = mostCommonReason(nightReasons)
  return {
    kind: 'eveningToNight',
    sampleSize: eveningThenNight.length,
    eveningCount: evening.length,
    eveningThenNightCount: eveningThenNight.length,
    averageMinutes: mean(eveningThenNight.map((link) => link.minutesToNext)),
    topNextReason: includeReasons ? top?.reason : undefined,
    topNextReasonCount: includeReasons ? (top?.count ?? 0) : 0,
  }
}

/**
 * Up to three data-backed eating-pattern insights. Empty when N is too
 * small or no split actually differs — never a hardcoded rule list.
 */
export function eatingPatternInsights(
  links: EatingEpisodeLink[],
  options: { includeReasons?: boolean } = {},
): EatingPatternInsight[] {
  const includeReasons = options.includeReasons ?? true
  const candidates: EatingPatternInsight[] = []
  const carb = carbGapInsight(links, includeReasons)
  if (carb) candidates.push(carb)
  const evening = eveningToNightInsight(links, includeReasons)
  if (evening) candidates.push(evening)
  return candidates.slice(0, 3)
}
