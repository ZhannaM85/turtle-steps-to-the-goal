import { z } from 'zod'

const goalSchema = z.object({
  id: z.string(),
  targetWeeklyLossKg: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// The day's overall mood — unchanged by #54.
const dayEmotionSchema = z.enum(['happy', 'unhappy', 'neutral'])
// A single meal's reaction (#54) — a different, smaller set than the day's mood.
const mealEmotionSchema = z.enum(['thumbsUp', 'thumbsDown', 'bellissimo'])

// #81: a meal groups 1+ items (e.g. soup + bread + cheese) instead of being
// a single flat kcal/macro record. note/emotion/timeEaten stay group-level;
// amountKcal/macros move onto each item.
const calorieItemSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  amountKcal: z.number(),
  proteinG: z.number().optional(),
  fatG: z.number().optional(),
  carbsG: z.number().optional(),
})

const calorieEntrySchema = z.object({
  id: z.string(),
  items: z.array(calorieItemSchema),
  note: z.string().optional(),
  emotion: mealEmotionSchema.optional(),
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
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const exportBundleSchema = z.object({
  version: z.literal(5),
  exportedAt: z.string(),
  goals: z.array(goalSchema),
  dailyEntries: z.array(dailyEntrySchema),
})

export type ExportBundle = z.infer<typeof exportBundleSchema>

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
