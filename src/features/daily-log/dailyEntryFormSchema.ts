import { z } from 'zod'

// The day's overall mood — unchanged by #54.
const dayEmotionSchema = z.enum(['happy', 'unhappy', 'neutral'])
// A single meal's reaction (#54) — a different, smaller set than the day's mood.
const mealEmotionSchema = z.enum(['thumbsUp', 'thumbsDown', 'bellissimo'])

// Macros (#51) — optional and independent of each other and of amountKcal.
const macroGramsSchema = z.number().nonnegative().max(1000)

// Time eaten (#65) — "HH:MM" 24-hour, time-of-day only. Optional/clearable.
export const timeEatenSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .optional()

const calorieEntrySchema = z.object({
  id: z.string(),
  amountKcal: z.number().positive().max(10000),
  note: z.string().max(500).optional(),
  emotion: mealEmotionSchema.optional(),
  createdAt: z.string(),
  proteinG: macroGramsSchema.optional(),
  fatG: macroGramsSchema.optional(),
  carbsG: macroGramsSchema.optional(),
  timeEaten: timeEatenSchema,
})

export const weightSchema = z.number().min(20).max(400).optional()
export const noteSchema = z.string().max(500).optional()
// Sleep (#59) — independent optional fields, no cross-check between them.
export const sleepHoursSchema = z.number().min(0).max(24).optional()
export const deepSleepHoursSchema = z.number().min(0).max(24).optional()
// Steps (#60) — optional, independent of everything else. Capped at 20,000
// (#68), a realistic daily ceiling rather than the original 100,000.
export const stepsSchema = z.number().min(0).max(20000).optional()
// Opt-in cycle tracking (#61) — only ever rendered/settable when the
// Settings toggle is on, but the schema itself doesn't need to know that.
export const onPeriodSchema = z.boolean().optional()

export const dailyEntryFormSchema = z.object({
  weightKg: weightSchema,
  calorieEntries: z.array(calorieEntrySchema).optional(),
  note: noteSchema,
  emotion: dayEmotionSchema.optional(),
  sleepHours: sleepHoursSchema,
  deepSleepHours: deepSleepHoursSchema,
  steps: stepsSchema,
  onPeriod: onPeriodSchema,
})

export type DailyEntryFormValues = z.infer<typeof dailyEntryFormSchema>
