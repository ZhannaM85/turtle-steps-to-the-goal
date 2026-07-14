import { z } from 'zod'

const goalSchema = z.object({
  id: z.string(),
  targetWeeklyLossKg: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const emotionSchema = z.enum(['happy', 'unhappy', 'neutral'])

const calorieEntrySchema = z.object({
  id: z.string(),
  amountKcal: z.number(),
  note: z.string().optional(),
  emotion: emotionSchema.optional(),
  createdAt: z.string(),
})

const dailyEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  weightKg: z.number().optional(),
  calorieEntries: z.array(calorieEntrySchema).optional(),
  note: z.string().optional(),
  emotion: emotionSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const exportBundleSchema = z.object({
  version: z.literal(3),
  exportedAt: z.string(),
  goals: z.array(goalSchema),
  dailyEntries: z.array(dailyEntrySchema),
})

export type ExportBundle = z.infer<typeof exportBundleSchema>

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
