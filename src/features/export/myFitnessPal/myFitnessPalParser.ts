import { format } from 'date-fns'
import type { CalorieEntry, CalorieItem } from '@/domain/dailyEntry'
import {
  BUILTIN_MEAL_SLOT_DEFAULT_TIMES,
  defaultTimeEatenForMealLabel,
  type MealSlotDefaultTimes,
} from '@/shared/lib/mealLabel'
import { normalizeTextSpaces } from '@/shared/lib/normalizeTextSpaces'
import type { DailyEntryPatch } from '../mergeDailyEntryPatches'

/**
 * One row from the export's single flat sheet (#367) — every row carries a
 * `type` discriminator instead of one file per data category the way Zepp
 * Life/Apple Health do. Only the two `type`s this app has a mapping for
 * (`Foods`, `Measurement`) are represented here; every other real `type` in
 * the export (`Daily Nutrition Totals`, `Steps`, `User Food`, `Exercise`,
 * `Water`, `User Recipe`, `User Preferences`) is out of scope per the
 * issue's own resolved priority (meals + weight only — steps/exercise
 * already come from Apple Health) and never reaches this shape at all.
 */
export type MyFitnessPalRow =
  | {
      type: 'Foods'
      date: string // yyyy-MM-dd
      description?: string
      calories?: number
      proteinG?: number
      fatG?: number
      carbsG?: number
      fiberG?: number
      /** Raw JSON string from the `details_json` column — carries `meal`
       * ("Breakfast"/"Lunch"/"Dinner"/"Snacks") and `brand_name`. Kept raw
       * here and parsed in `buildMyFitnessPalPatches` so a single
       * malformed row's JSON can't take the whole parse down. */
      detailsJson?: string
    }
  | {
      type: 'Measurement'
      date: string
      description?: string
      value?: number
      unit?: string
    }

const MEASUREMENT_TYPE = 'Measurement'
const WEIGHT_DESCRIPTION = 'weight'
const WEIGHT_UNIT = 'kilograms'

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}/

/** A cell's `date` column can come back from `exceljs` as a real `Date`
 * (when the source column is date-formatted) or a plain string (most real
 * Data Access Request exports store it as text) — both are handled, since
 * which one shows up isn't confirmed for every export. */
export function cellToDateString(value: unknown): string | undefined {
  if (value instanceof Date) return format(value, 'yyyy-MM-dd')
  if (typeof value === 'string') {
    const match = DATE_ONLY_RE.exec(value.trim())
    return match?.[0]
  }
  return undefined
}

export function cellToNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

export function cellToString(value: unknown): string | undefined {
  // #559: MFP / pasted web titles often use NBSP between words — convert
  // before trim so imported dish names wrap normally in meal cards.
  if (typeof value === 'string') {
    return normalizeTextSpaces(value).trim() || undefined
  }
  if (typeof value === 'number') return String(value)
  return undefined
}

/**
 * Groups `Foods` rows into `CalorieEntry`/`CalorieItem` (#367's main
 * payoff — #365/#366 only ever covered body metrics, never meals) and maps
 * `Measurement` "weight" rows straight to `weightKg`, same simple scalar
 * shape #365/#366 already established.
 */
export function buildMyFitnessPalPatches(
  rows: MyFitnessPalRow[],
  /** #588 — remembered/imported slot clocks; defaults match #580 builtins. */
  slotTimes: MealSlotDefaultTimes = BUILTIN_MEAL_SLOT_DEFAULT_TIMES,
): Map<string, DailyEntryPatch> {
  const patches = new Map<string, DailyEntryPatch>()
  // date -> meal label ('' when details_json had none/failed to parse) -> items
  const mealsByDateAndLabel = new Map<string, Map<string, CalorieItem[]>>()

  for (const row of rows) {
    if (row.type === MEASUREMENT_TYPE) {
      if (row.description !== WEIGHT_DESCRIPTION) continue
      if (row.unit !== WEIGHT_UNIT) continue
      if (row.value === undefined) continue
      patches.set(row.date, { ...patches.get(row.date), weightKg: row.value })
      continue
    }

    if (row.calories === undefined) continue

    let meal: string | undefined
    let brand: string | undefined
    if (row.detailsJson) {
      try {
        const parsed = JSON.parse(row.detailsJson) as {
          meal?: string
          brand_name?: string
        }
        meal =
          typeof parsed.meal === 'string'
            ? normalizeTextSpaces(parsed.meal).trim() || undefined
            : undefined
        brand =
          typeof parsed.brand_name === 'string'
            ? normalizeTextSpaces(parsed.brand_name).trim() || undefined
            : undefined
      } catch {
        // Malformed details_json on this one row -- fall through with no
        // meal/brand rather than losing the whole import over one row.
      }
    }

    const item: CalorieItem = {
      id: crypto.randomUUID(),
      name:
        typeof row.description === 'string'
          ? normalizeTextSpaces(row.description).trim() || undefined
          : row.description,
      brand,
      amountKcal: row.calories,
      proteinG: row.proteinG,
      fatG: row.fatG,
      carbsG: row.carbsG,
      fiberG: row.fiberG,
    }

    const byLabel = mealsByDateAndLabel.get(row.date) ?? new Map()
    const labelKey = meal ?? ''
    const items = byLabel.get(labelKey) ?? []
    items.push(item)
    byLabel.set(labelKey, items)
    mealsByDateAndLabel.set(row.date, byLabel)
  }

  // #367 — created_at/updated_at were blank on every sampled row (no
  // per-item timestamp in this export), so there's no real clock time to
  // give each imported meal group. A fixed midday placeholder, not
  // "now"/import time, keeps every group's own createdAt at least tied to
  // the day it actually happened on rather than the unrelated moment it
  // happened to get imported.
  // #580/#588 — assign a slot-based timeEaten from remembered prefs (or
  // built-in clocks) so Day cards and late-meal/night-eating stats aren't
  // left blank when the export only had a meal name, not a clock time.
  for (const [date, byLabel] of mealsByDateAndLabel) {
    const calorieEntries: CalorieEntry[] = [...byLabel.entries()].map(
      ([label, items]) => {
        const timeEaten = defaultTimeEatenForMealLabel(
          label || undefined,
          slotTimes,
        )
        return {
          id: crypto.randomUUID(),
          items,
          ...(label ? { label } : {}),
          ...(timeEaten ? { timeEaten } : {}),
          createdAt: `${date}T12:00:00.000Z`,
        }
      },
    )
    patches.set(date, { ...patches.get(date), calorieEntries })
  }

  return patches
}
