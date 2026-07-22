import { z } from 'zod'

const goalSchema = z.object({
  id: z.string(),
  targetWeeklyLossKg: z.number(),
  // Anchors the goal's own 7-day tracking window (#135) — purely
  // additive/optional, same no-version-bump reasoning as the DailyEntry
  // fields below: a bundle written before this field existed still parses
  // fine (weekStart ends up undefined, same as a goal never re-saved
  // since #135 shipped).
  weekStart: z.string().optional(),
  // Optional daily calories target (#208) — same purely-additive/optional
  // reasoning as weekStart above.
  dailyCalorieTargetKcal: z.number().optional(),
  // Optional daily protein target (#220) — same reasoning again.
  dailyProteinTargetG: z.number().optional(),
  // Optional daily fat/carb targets (#252) — same reasoning again.
  dailyFatTargetG: z.number().optional(),
  dailyCarbTargetG: z.number().optional(),
  // Optional daily water target (#258) — same reasoning again.
  dailyWaterTargetMl: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// The day's overall mood — unchanged by #54.
const dayEmotionSchema = z.enum(['happy', 'unhappy', 'neutral'])
// A single meal's reaction (#54) — a different, smaller set than the day's mood.
const mealEmotionSchema = z.enum(['thumbsUp', 'thumbsDown', 'bellissimo'])

// #81: a meal groups 1+ items (e.g. soup + bread + cheese) instead of being
// a single flat kcal/macro record. note/timeEaten stay group-level;
// amountKcal/macros/emotion move onto each item.
const calorieItemSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  amountKcal: z.number(),
  proteinG: z.number().optional(),
  fatG: z.number().optional(),
  carbsG: z.number().optional(),
  // Portion weight in grams (#93) — purely additive/optional, same
  // no-version-bump reasoning as timeEaten below.
  amountG: z.number().optional(),
  // Per-dish reaction (#129) — moved here from the meal group so different
  // items in the same meal can carry different reactions.
  emotion: mealEmotionSchema.optional(),
})

const calorieEntrySchema = z.object({
  id: z.string(),
  items: z.array(calorieItemSchema),
  // Custom meal name (#110) — purely additive/optional, same
  // no-version-bump reasoning as amountG/timeEaten above.
  label: z.string().optional(),
  note: z.string().optional(),
  createdAt: z.string(),
  // Time eaten (#65) — purely additive/optional, same no-version-bump
  // reasoning as macros/sleep/steps above.
  timeEaten: z.string().optional(),
})

const dailyEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  weightKg: z.number().optional(),
  calorieEntries: z.array(calorieEntrySchema).optional(),
  note: z.string().optional(),
  emotion: dayEmotionSchema.optional(),
  // Sleep (#59) — purely additive/optional, same no-version-bump reasoning
  // as macros above.
  sleepHours: z.number().optional(),
  deepSleepHours: z.number().optional(),
  // Steps (#60) — same reasoning, purely additive/optional.
  steps: z.number().optional(),
  // Opt-in cycle tracking (#61) — the logged value travels with a backup
  // like any other field; only the Settings on/off toggle is local-only.
  onPeriod: z.boolean().optional(),
  // Opt-in digestion tracking, same reasoning/shape as onPeriod above.
  // Reframed around the problem (constipation) instead of the normal day
  // (previously `hadBowelMovement`) — a clean cut, not a migration: the old
  // field meant the opposite thing, so an old bundle's value has no correct
  // equivalent here and is simply dropped on import (Zod strips unknown keys
  // by default).
  hadConstipation: z.boolean().optional(),
  // Opt-in water tracking (#258) — same reasoning/shape as onPeriod above.
  waterMl: z.number().optional(),
  // Body measurements (#225) — purely additive/optional, same
  // no-version-bump reasoning as sleep/steps above.
  waistCm: z.number().optional(),
  hipCm: z.number().optional(),
  bodyFatPercent: z.number().optional(),
  // Body composition (#233) — same purely-additive/optional reasoning.
  muscleMassKg: z.number().optional(),
  visceralFatRating: z.number().optional(),
  bodyWaterPercent: z.number().optional(),
  boneMassKg: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// Personal meal-name library (#86) — previously local-only/not exported;
// #113 added it here as purely additive/optional, same no-version-bump
// reasoning as the entity-level fields above: an older bundle without this
// field still parses fine (mealItems ends up undefined, importAllData
// treats that as "nothing to import").
const mealItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastAmountKcal: z.number().optional(),
  lastProteinG: z.number().optional(),
  lastFatG: z.number().optional(),
  lastCarbsG: z.number().optional(),
  lastAmountG: z.number().optional(),
})

// Per-device curated-food-list customizations (#90) — same #113
// purely-additive addition as mealItemSchema above.
const foodOverrideSchema = z.object({
  foodId: z.string(),
  hidden: z.boolean().optional(),
  kcal100: z.number().optional(),
  protein100: z.number().optional(),
  fat100: z.number().optional(),
  carbs100: z.number().optional(),
  updatedAt: z.string(),
})

export const exportBundleSchema = z.object({
  version: z.literal(6),
  exportedAt: z.string(),
  goals: z.array(goalSchema),
  dailyEntries: z.array(dailyEntrySchema),
  mealItems: z.array(mealItemSchema).optional(),
  foodOverrides: z.array(foodOverrideSchema).optional(),
})

export type ExportBundle = z.infer<typeof exportBundleSchema>

/**
 * Backups written before #129 carried a meal's reaction on the group
 * (CalorieEntry.emotion) instead of on each item. Recognized separately so
 * `parseExportBundle` can fold it onto the item on import — see
 * `upgradeV5ToV6` in exportActions.ts.
 */
const calorieItemSchemaV5 = z.object({
  id: z.string(),
  name: z.string().optional(),
  amountKcal: z.number(),
  proteinG: z.number().optional(),
  fatG: z.number().optional(),
  carbsG: z.number().optional(),
  amountG: z.number().optional(),
})

const calorieEntrySchemaV5 = z.object({
  id: z.string(),
  items: z.array(calorieItemSchemaV5),
  label: z.string().optional(),
  note: z.string().optional(),
  emotion: mealEmotionSchema.optional(),
  createdAt: z.string(),
  timeEaten: z.string().optional(),
})

const dailyEntrySchemaV5 = z.object({
  id: z.string(),
  date: z.string(),
  weightKg: z.number().optional(),
  calorieEntries: z.array(calorieEntrySchemaV5).optional(),
  note: z.string().optional(),
  emotion: dayEmotionSchema.optional(),
  sleepHours: z.number().optional(),
  deepSleepHours: z.number().optional(),
  steps: z.number().optional(),
  onPeriod: z.boolean().optional(),
  hadBowelMovement: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const exportBundleSchemaV5 = z.object({
  version: z.literal(5),
  exportedAt: z.string(),
  goals: z.array(goalSchema),
  dailyEntries: z.array(dailyEntrySchemaV5),
  mealItems: z.array(mealItemSchema).optional(),
  foodOverrides: z.array(foodOverrideSchema).optional(),
})

export type ExportBundleV5 = z.infer<typeof exportBundleSchemaV5>

/**
 * Backups written before #81 stored each meal as a single flat kcal/macro
 * record instead of a group of items. Recognized separately so
 * `parseExportBundle` can fold each into a single-item group on import.
 */
const calorieEntrySchemaV4 = z.object({
  id: z.string(),
  amountKcal: z.number(),
  note: z.string().optional(),
  emotion: mealEmotionSchema.optional(),
  createdAt: z.string(),
  proteinG: z.number().optional(),
  fatG: z.number().optional(),
  carbsG: z.number().optional(),
  timeEaten: z.string().optional(),
})

const dailyEntrySchemaV4 = z.object({
  id: z.string(),
  date: z.string(),
  weightKg: z.number().optional(),
  calorieEntries: z.array(calorieEntrySchemaV4).optional(),
  note: z.string().optional(),
  emotion: dayEmotionSchema.optional(),
  sleepHours: z.number().optional(),
  deepSleepHours: z.number().optional(),
  steps: z.number().optional(),
  onPeriod: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const exportBundleSchemaV4 = z.object({
  version: z.literal(4),
  exportedAt: z.string(),
  goals: z.array(goalSchema),
  dailyEntries: z.array(dailyEntrySchemaV4),
})

export type ExportBundleV4 = z.infer<typeof exportBundleSchemaV4>

/**
 * Backups written before #54 used the old shared happy/unhappy/neutral set
 * for a meal's own emotion too (rather than today's thumbsUp/thumbsDown/
 * bellissimo). Recognized separately so `parseExportBundle` can upgrade an
 * old backup on import — old meal emotions are cleared (per #54's decision
 * not to auto-map them), not rejected.
 */
const calorieEntrySchemaV3 = z.object({
  id: z.string(),
  amountKcal: z.number(),
  note: z.string().optional(),
  emotion: dayEmotionSchema.optional(),
  createdAt: z.string(),
})

const dailyEntrySchemaV3 = z.object({
  id: z.string(),
  date: z.string(),
  weightKg: z.number().optional(),
  calorieEntries: z.array(calorieEntrySchemaV3).optional(),
  note: z.string().optional(),
  emotion: dayEmotionSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const exportBundleSchemaV3 = z.object({
  version: z.literal(3),
  exportedAt: z.string(),
  goals: z.array(goalSchema),
  dailyEntries: z.array(dailyEntrySchemaV3),
})

export type ExportBundleV3 = z.infer<typeof exportBundleSchemaV3>

/**
 * Backups written before #21 stored a single `caloriesConsumed` number
 * instead of itemized `calorieEntries`. Recognized separately so
 * `parseExportBundle` can upgrade an old backup file on import rather than
 * rejecting it — export/import is this app's only data-safety mechanism, so
 * an old file must stay importable.
 */
const dailyEntrySchemaV2 = z.object({
  id: z.string(),
  date: z.string(),
  weightKg: z.number().optional(),
  caloriesConsumed: z.number().optional(),
  note: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const exportBundleSchemaV2 = z.object({
  version: z.literal(2),
  exportedAt: z.string(),
  goals: z.array(goalSchema),
  dailyEntries: z.array(dailyEntrySchemaV2),
})

export type ExportBundleV2 = z.infer<typeof exportBundleSchemaV2>
