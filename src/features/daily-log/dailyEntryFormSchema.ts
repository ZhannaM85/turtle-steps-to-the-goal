import { z } from 'zod'

// The day's overall mood — unchanged by #54.
const dayEmotionSchema = z.enum(['happy', 'unhappy', 'neutral'])
// A single meal's reaction (#54) — a different, smaller set than the day's mood.
const mealEmotionSchema = z.enum(['thumbsUp', 'thumbsDown', 'bellissimo'])

const calorieEntrySchema = z.object({
  id: z.string(),
  amountKcal: z.number().positive().max(10000),
  note: z.string().max(500).optional(),
  emotion: mealEmotionSchema.optional(),
  createdAt: z.string(),
})

export const weightSchema = z.number().min(20).max(400).optional()
export const noteSchema = z.string().max(500).optional()

export const dailyEntryFormSchema = z.object({
  weightKg: weightSchema,
  calorieEntries: z.array(calorieEntrySchema).optional(),
  note: noteSchema,
  emotion: dayEmotionSchema.optional(),
})

export type DailyEntryFormValues = z.infer<typeof dailyEntryFormSchema>
