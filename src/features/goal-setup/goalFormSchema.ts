import { z } from 'zod'
import type { Dictionary } from '@/i18n'

export function makeGoalFormSchema(t: Dictionary) {
  return z
    .object({
      targetWeeklyLoss: z.number().max(10).optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.targetWeeklyLoss || data.targetWeeklyLoss <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['targetWeeklyLoss'],
          message: t.goal.targetRequired,
        })
      }
    })
}

export type GoalFormValues = z.infer<ReturnType<typeof makeGoalFormSchema>>
