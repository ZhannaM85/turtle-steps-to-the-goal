import { z } from 'zod'
import type { Dictionary } from '@/i18n'

/**
 * Form field shape for RHF (#534). Kept explicit (not `z.infer`) so
 * `zodResolver` stays assignable when the schema accepts RHF’s post-`reset`
 * empty strings via preprocess — preprocess widens Zod’s *input* to
 * `unknown`, which otherwise breaks `Resolver<GoalFormValues>`.
 */
export type GoalFormValues = {
  targetWeeklyLoss?: number
  dailyCalorieTarget?: number
  dailyProteinTarget?: number
  dailyFatTarget?: number
  dailyCarbTarget?: number
  dailyFiberTarget?: number
  dailySodiumTarget?: number
  dailyPotassiumTarget?: number
  dailyMagnesiumTarget?: number
  dailyWaterTarget?: number
  /** #659 — the window's editable "ends on" date (ISO). Always prefilled
   * (see `defaultWeekEndDate` in goalFormMapping.ts), never left blank by
   * the app itself. */
  weekEndDate?: string
}

/** RHF may hold `''` after reset (#241 / #534); Zod number fields reject that. */
function optionalNumber(schema: z.ZodNumber) {
  return z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    schema.optional(),
  )
}

export function makeGoalFormSchema(t: Dictionary) {
  return z
    .object({
      targetWeeklyLoss: optionalNumber(z.number().max(10)),
      // #208 — genuinely optional, unlike targetWeeklyLoss: no superRefine
      // requiring it below, since not everyone wants a daily calories
      // target alongside the weekly weight-loss one.
      dailyCalorieTarget: optionalNumber(z.number().positive().max(10000)),
      // #220 — same reasoning as dailyCalorieTarget, independent of it.
      dailyProteinTarget: optionalNumber(z.number().positive().max(1000)),
      // #252 — same reasoning again, each independent of the other three.
      dailyFatTarget: optionalNumber(z.number().positive().max(1000)),
      dailyCarbTarget: optionalNumber(z.number().positive().max(1000)),
      // #341 — same reasoning again, independent of the other four.
      dailyFiberTarget: optionalNumber(z.number().positive().max(1000)),
      // #530 — electrolytes in mg; independent optional targets.
      dailySodiumTarget: optionalNumber(z.number().positive().max(20000)),
      dailyPotassiumTarget: optionalNumber(z.number().positive().max(20000)),
      dailyMagnesiumTarget: optionalNumber(z.number().positive().max(5000)),
      // #258 — same reasoning again, independent of the macro targets.
      dailyWaterTarget: optionalNumber(z.number().positive().max(10000)),
      // #659 — bounded by the `min` attribute on the date input itself
      // (the window's start), same as the existing DeleteRangeSection date
      // pair; no separate Zod cross-field check.
      weekEndDate: z.string().optional(),
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
