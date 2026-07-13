import { z } from 'zod'
import type { Dictionary } from '@/i18n'

const emotionSchema = z.enum(['happy', 'unhappy', 'neutral'])

const calorieEntrySchema = z.object({
  id: z.string(),
  amountKcal: z.number().positive().max(10000),
  note: z.string().max(500).optional(),
  emotion: emotionSchema.optional(),
  createdAt: z.string(),
})

export function makeDailyEntryFormSchema(t: Dictionary) {
  return z
    .object({
      weightKg: z.number().min(20).max(400).optional(),
      calorieEntries: z.array(calorieEntrySchema).optional(),
      note: z.string().max(500).optional(),
    })
    .superRefine((data, ctx) => {
      const hasCalories = (data.calorieEntries?.length ?? 0) > 0
      if (data.weightKg === undefined && !hasCalories) {
        ctx.addIssue({
          code: 'custom',
          path: ['weightKg'],
          message: t.dailyEntry.weightOrCaloriesRequired,
        })
      }
    })
}

export type DailyEntryFormValues = z.infer<
  ReturnType<typeof makeDailyEntryFormSchema>
>
