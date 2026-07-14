import { z } from 'zod'

const emotionSchema = z.enum(['happy', 'unhappy', 'neutral'])

const calorieEntrySchema = z.object({
  id: z.string(),
  amountKcal: z.number().positive().max(10000),
  note: z.string().max(500).optional(),
  emotion: emotionSchema.optional(),
  createdAt: z.string(),
})

export const weightSchema = z.number().min(20).max(400).optional()
export const noteSchema = z.string().max(500).optional()

export const dailyEntryFormSchema = z.object({
  weightKg: weightSchema,
  calorieEntries: z.array(calorieEntrySchema).optional(),
  note: noteSchema,
  emotion: emotionSchema.optional(),
})

export type DailyEntryFormValues = z.infer<typeof dailyEntryFormSchema>
