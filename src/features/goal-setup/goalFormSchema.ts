import { z } from 'zod'

export const goalFormSchema = z
  .object({
    displayUnit: z.enum(['kg', 'lb']),
    targetWeeklyLoss: z.number().max(10).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.targetWeeklyLoss || data.targetWeeklyLoss <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetWeeklyLoss'],
        message: "Enter this week's target, greater than 0",
      })
    }
  })

export type GoalFormValues = z.infer<typeof goalFormSchema>
