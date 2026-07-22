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

// #81: a meal groups 1+ items instead of being a single flat kcal/macro
// record — see domain/dailyEntry/DailyEntry.ts's CalorieItem/CalorieEntry.
const calorieItemSchema = z.object({
  id: z.string(),
  name: z.string().max(500).optional(),
  amountKcal: z.number().positive().max(10000),
  proteinG: macroGramsSchema.optional(),
  fatG: macroGramsSchema.optional(),
  carbsG: macroGramsSchema.optional(),
  // Per-dish reaction (#129) — moved here from the meal group so different
  // items in the same meal can carry different reactions.
  emotion: mealEmotionSchema.optional(),
})

const calorieEntrySchema = z.object({
  id: z.string(),
  items: z.array(calorieItemSchema),
  note: z.string().max(500).optional(),
  createdAt: z.string(),
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
// Opt-in digestion tracking — same shape/gating as onPeriod above.
export const hadConstipationSchema = z.boolean().optional()
// Opt-in water tracking (#258) — a running daily total in ml, same
// gating shape as onPeriod/hadConstipation above. 10000ml (10L) is a
// generous human ceiling, not a recommendation.
export const waterMlSchema = z.number().min(0).max(10000).optional()
// Body measurements (#225) — independent optional fields, same shape as
// sleep/steps above. Bounds are generous human ranges, not medical limits.
export const waistCmSchema = z.number().min(30).max(300).optional()
export const hipCmSchema = z.number().min(30).max(300).optional()
export const bodyFatPercentSchema = z.number().min(0).max(80).optional()
// Body composition (#233) — bioimpedance-scale-style numbers, same
// generous-human-range reasoning as the measurements above. Visceral fat
// is a unitless rating (most smart scales report roughly 1-30, healthy
// range under ~10) rather than a physical measurement.
export const muscleMassKgSchema = z.number().min(0).max(150).optional()
export const visceralFatRatingSchema = z.number().min(0).max(60).optional()
export const bodyWaterPercentSchema = z.number().min(0).max(80).optional()
export const boneMassKgSchema = z.number().min(0).max(20).optional()

export const dailyEntryFormSchema = z.object({
  weightKg: weightSchema,
  calorieEntries: z.array(calorieEntrySchema).optional(),
  note: noteSchema,
  emotion: dayEmotionSchema.optional(),
  sleepHours: sleepHoursSchema,
  deepSleepHours: deepSleepHoursSchema,
  steps: stepsSchema,
  onPeriod: onPeriodSchema,
  hadConstipation: hadConstipationSchema,
  waterMl: waterMlSchema,
  waistCm: waistCmSchema,
  hipCm: hipCmSchema,
  bodyFatPercent: bodyFatPercentSchema,
  muscleMassKg: muscleMassKgSchema,
  visceralFatRating: visceralFatRatingSchema,
  bodyWaterPercent: bodyWaterPercentSchema,
  boneMassKg: boneMassKgSchema,
})

export type DailyEntryFormValues = z.infer<typeof dailyEntryFormSchema>
