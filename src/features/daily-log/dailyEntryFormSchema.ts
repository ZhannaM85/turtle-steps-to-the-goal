import { z } from 'zod'

export const dailyEntryFormSchema = z
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
        message: 'Enter a weight or a calorie total',
      })
    }
  })

export type DailyEntryFormValues = z.infer<typeof dailyEntryFormSchema>
