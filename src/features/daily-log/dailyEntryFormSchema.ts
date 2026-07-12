import { z } from 'zod'
import type { Dictionary } from '@/i18n'

export function makeDailyEntryFormSchema(t: Dictionary) {
  return z
    .object({
      weightKg: z.number().min(20).max(400).optional(),
      caloriesConsumed: z.number().min(0).max(10000).optional(),
      note: z.string().max(500).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.weightKg === undefined && data.caloriesConsumed === undefined) {
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
