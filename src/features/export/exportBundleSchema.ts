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

const calorieEntrySchema = z.object({
  id: z.string(),
  amountKcal: z.number(),
  note: z.string().optional(),
  emotion: mealEmotionSchema.optional(),
  createdAt: z.string(),
})

const dailyEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  weightKg: z.number().optional(),
  calorieEntries: z.array(calorieEntrySchema).optional(),
  note: z.string().optional(),
  emotion: dayEmotionSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const exportBundleSchema = z.object({
  version: z.literal(4),
  exportedAt: z.string(),
  goals: z.array(goalSchema),
  dailyEntries: z.array(dailyEntrySchema),
})

export type ExportBundle = z.infer<typeof exportBundleSchema>

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
