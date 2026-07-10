import { z } from 'zod'

const goalSchema = z.object({
  id: z.string(),
  startDate: z.string(),
  startWeightKg: z.number(),
  targetWeightKg: z.number(),
  targetWeeklyLossKg: z.number(),
  targetDate: z.string().optional(),
  displayUnit: z.enum(['kg', 'lb']),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const dailyEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  weightKg: z.number().optional(),
  caloriesConsumed: z.number().optional(),
  note: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const exportBundleSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  goals: z.array(goalSchema),
  dailyEntries: z.array(dailyEntrySchema),
})

export type ExportBundle = z.infer<typeof exportBundleSchema>
