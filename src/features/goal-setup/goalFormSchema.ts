import { z } from 'zod'

export const goalFormSchema = z
  .object({
    displayUnit: z.enum(['kg', 'lb']),
    startWeight: z.number().positive().max(1000),
    targetWeight: z.number().positive().max(1000),
    paceMode: z.enum(['weeklyLoss', 'targetDate']),
    targetWeeklyLoss: z.number().optional(),
    targetDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paceMode === 'weeklyLoss') {
      if (!data.targetWeeklyLoss || data.targetWeeklyLoss <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['targetWeeklyLoss'],
          message: 'Enter a weekly pace greater than 0',
        })
      }
    } else if (!data.targetDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetDate'],
        message: 'Choose a target date',
      })
    }
  })

export type GoalFormValues = z.infer<typeof goalFormSchema>
