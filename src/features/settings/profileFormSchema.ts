import { z } from 'zod'

// Height/age (#233) — generous human ranges, same reasoning as the daily
// entry's body-measurement schemas (waistCmSchema etc. in
// dailyEntryFormSchema.ts). Kept separate from that file since these
// aren't DailyEntry fields — they live in profileStore, not an entry.
export const heightCmSchema = z.number().min(50).max(272).optional()
export const ageSchema = z.number().min(1).max(120).optional()
