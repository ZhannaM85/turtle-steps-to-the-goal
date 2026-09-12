import {
  BUILTIN_MEAL_SLOT_DEFAULT_TIMES,
  effectiveTimeEaten,
  mealSlotKeyForLabel,
  type MealSlotDefaultTimes,
  type MealSlotKey,
} from '@/shared/lib/mealLabel'

/** Chronological built-in slots — snack sits between lunch and dinner. */
const MEAL_SLOT_KEYS: MealSlotKey[] = [
  'breakfast',
  'lunch',
  'snack',
  'dinner',
]

export interface TemplatePickTimeOptions {
  siblingMeals?: readonly {
    timeEaten?: string
    label?: string | number
  }[]
  slotTimes?: MealSlotDefaultTimes
  /** Typically now, or the time field before the chip pick. */
  referenceHHMM: string
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function circularMinutesApart(a: number, b: number): number {
  const diff = Math.abs(a - b) % (24 * 60)
  return Math.min(diff, 24 * 60 - diff)
}

function usedMealSlotKeys(
  meals: readonly { timeEaten?: string; label?: string | number }[],
  slotTimes: MealSlotDefaultTimes,
): Set<MealSlotKey> {
  const timeToSlot = new Map<string, MealSlotKey>()
  for (const key of MEAL_SLOT_KEYS) {
    timeToSlot.set(slotTimes[key], key)
  }
  const used = new Set<MealSlotKey>()
  for (const meal of meals) {
    const fromLabel = mealSlotKeyForLabel(meal.label)
    if (fromLabel) used.add(fromLabel)
    const clock = effectiveTimeEaten(meal, slotTimes)
    if (!clock) continue
    const fromTime = timeToSlot.get(clock)
    if (fromTime) used.add(fromTime)
  }
  return used
}

function nearestUnusedSlotTime(
  used: Set<MealSlotKey>,
  slotTimes: MealSlotDefaultTimes,
  referenceHHMM: string,
): string {
  const unused = MEAL_SLOT_KEYS.filter((key) => !used.has(key))
  const candidates = unused.length > 0 ? unused : MEAL_SLOT_KEYS
  const ref = timeToMinutes(referenceHHMM)
  let bestKey = candidates[0]
  let bestDist = Infinity
  for (const key of candidates) {
    const slotMin = timeToMinutes(slotTimes[key])
    const dist = circularMinutesApart(slotMin, ref)
    if (dist < bestDist) {
      bestDist = dist
      bestKey = key
      continue
    }
    if (dist !== bestDist) continue
    // Tie: prefer the upcoming slot (at/after now), then the later clock.
    const bestMin = timeToMinutes(slotTimes[bestKey])
    const bestUpcoming = bestMin >= ref
    const slotUpcoming = slotMin >= ref
    if (slotUpcoming && !bestUpcoming) bestKey = key
    else if (slotUpcoming === bestUpcoming && slotMin > bestMin) bestKey = key
  }
  return slotTimes[bestKey]
}

/**
 * #862 Option 2 — chip pick stamps a default clock. Built-in EN/RU/MFP
 * labels use their own slot time. Custom templates get the unused built-in
 * slot time nearest to `referenceHHMM` (usually now / the field value).
 *
 * Settings templates stay names-only — no per-template clock schema
 * (Option 1). Callers stamp on chip pick or custom-template seed only;
 * do not rewrite historical meals. #595 still stamps built-in labels only.
 */
export function defaultTimeEatenForTemplatePick(
  label: string | number | undefined,
  options: TemplatePickTimeOptions,
): string | undefined {
  const slotTimes = options.slotTimes ?? BUILTIN_MEAL_SLOT_DEFAULT_TIMES
  const builtIn = mealSlotKeyForLabel(label)
  if (builtIn) return slotTimes[builtIn]
  const text = label == null ? '' : String(label).trim()
  if (!text) return undefined
  return nearestUnusedSlotTime(
    usedMealSlotKeys(options.siblingMeals ?? [], slotTimes),
    slotTimes,
    options.referenceHHMM,
  )
}

/** Chip-pick stamp. Clearing the name, or editing a meal that already
 * has a clock (`overwriteExisting: false`), leaves time alone. */
export function timeAfterMealTemplatePick(
  label: string,
  options: TemplatePickTimeOptions & {
    overwriteExisting?: boolean
    existingTime?: string
  },
): string | undefined {
  if (label.trim() === '') return undefined
  if (!options.overwriteExisting && options.existingTime) return undefined
  return defaultTimeEatenForTemplatePick(label, options)
}
