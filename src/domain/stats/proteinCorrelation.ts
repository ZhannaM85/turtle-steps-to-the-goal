import { addDays, format, parseISO } from 'date-fns'
import { totalCalories, totalProtein, type DailyEntry } from '@/domain/dailyEntry'
import {
  classifyCorrelationStrength,
  DAILY_STRENGTH_THRESHOLDS_KG,
  type CorrelationStrength,
} from './correlationStrength'

export interface ProteinCorrelation {
  dayCount: number
  /** #322 — percent-of-calories threshold splitting the "less" and "more"
   * groups, not raw protein grams (see ProteinPoint below for why). */
  thresholdProteinPercent: number
  lessGroupAvgDeltaKg: number
  moreGroupAvgDeltaKg: number
  lessAveragedMoreGain: boolean
  /** #224 — plain-arithmetic strength label, see correlationStrength.ts. */
  strength: CorrelationStrength
}

const MIN_COMPARABLE_DAYS = 8

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export interface ProteinPoint {
  /** #224 — stable per-point key for tap-to-exclude outlier handling. */
  date: string
  /** #322 — protein's share of that day's total calories (0-100), not raw
   * grams. Raw grams naturally correlate with total calories eaten that
   * day (eating more of everything means more protein too), so splitting
   * on grams was largely picking up "ate a lot that day" rather than a
   * protein-specific effect — a high-protein-*share* day (protein up,
   * carbs/fat down, similar total calories) reads differently from simply
   * overeating across the board. */
  proteinPercent: number
  deltaKg: number
}

/**
 * Same day-pairing shape as `sleepPoints`/`stepsPoints` (#167, extending the
 * pattern #116 established) — each day's logged protein total paired with
 * the *next* calendar day's weight change. A day only contributes a point if
 * it has a logged weight, a logged protein total (via `totalProtein`), a
 * logged non-zero calorie total (needed to express protein as a share of
 * it), and the very next calendar date also has a logged weight.
 */
export function proteinPoints(entries: DailyEntry[]): ProteinPoint[] {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]))
  const points: ProteinPoint[] = []

  for (const entry of entries) {
    if (entry.weightKg === undefined) continue
    const proteinG = totalProtein(entry.calorieEntries)
    if (proteinG === undefined) continue
    const kcal = totalCalories(entry.calorieEntries)
    if (!kcal) continue
    const nextDate = format(addDays(parseISO(entry.date), 1), 'yyyy-MM-dd')
    const nextEntry = byDate.get(nextDate)
    if (!nextEntry || nextEntry.weightKg === undefined) continue
    points.push({
      date: nextEntry.date,
      proteinPercent: ((proteinG * 4) / kcal) * 100,
      deltaKg: nextEntry.weightKg - entry.weightKg,
    })
  }

  return points
}

/**
 * The median-split math on its own, taking already-computed points rather
 * than entries — #224 lets a view filter out manually-excluded outlier
 * points first and pass the remainder straight in. `proteinCorrelation`
 * below is a thin wrapper over this + `proteinPoints`.
 */
export function proteinCorrelationFromPoints(
  points: ProteinPoint[],
): ProteinCorrelation | null {
  if (points.length < MIN_COMPARABLE_DAYS) return null

  const sorted = [...points].sort((a, b) => a.proteinPercent - b.proteinPercent)
  const mid = Math.ceil(sorted.length / 2)
  const lessGroup = sorted.slice(0, mid)
  const moreGroup = sorted.slice(mid)
  if (moreGroup.length === 0) return null

  const lessGroupAvgDeltaKg = average(lessGroup.map((p) => p.deltaKg))
  const moreGroupAvgDeltaKg = average(moreGroup.map((p) => p.deltaKg))
  const rawThresholdProteinPercent =
    (lessGroup[lessGroup.length - 1].proteinPercent + moreGroup[0].proteinPercent) / 2

  return {
    dayCount: points.length,
    thresholdProteinPercent: Math.round(rawThresholdProteinPercent / 5) * 5,
    lessGroupAvgDeltaKg,
    moreGroupAvgDeltaKg,
    lessAveragedMoreGain: lessGroupAvgDeltaKg > moreGroupAvgDeltaKg,
    strength: classifyCorrelationStrength(
      moreGroupAvgDeltaKg - lessGroupAvgDeltaKg,
      DAILY_STRENGTH_THRESHOLDS_KG,
    ),
  }
}

/**
 * Plain-arithmetic median-split summary, same shape as `sleepCorrelation`/
 * `stepsCorrelation` — splits `proteinPoints`' comparable day-pairs into a
 * lower- and higher-protein-share half by median percent-of-calories (#322;
 * previously median grams), and reports which half averaged more next-day
 * gain. Requires MIN_COMPARABLE_DAYS pairs. Returns null otherwise.
 */
export function proteinCorrelation(
  entries: DailyEntry[],
): ProteinCorrelation | null {
  return proteinCorrelationFromPoints(proteinPoints(entries))
}
