import { z } from 'zod'
import type { Dictionary } from '@/i18n'

export function makeGoalFormSchema(t: Dictionary) {
  return z
    .object({
      targetWeeklyLoss: z.number().max(10).optional(),
      // #208 — genuinely optional, unlike targetWeeklyLoss: no superRefine
      // requiring it below, since not everyone wants a daily calories
      // target alongside the weekly weight-loss one.
      dailyCalorieTarget: z.number().positive().max(10000).optional(),
      // #220 — same reasoning as dailyCalorieTarget, independent of it.
      dailyProteinTarget: z.number().positive().max(1000).optional(),
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
