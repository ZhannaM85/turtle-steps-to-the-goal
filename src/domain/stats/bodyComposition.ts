/**
 * BMI/BMR (#233) — computed from the profile's height/age/sex plus a
 * day's own logged weight, never stored anywhere themselves. Real
 * formulas, not fabricated scores — consistent with this app's
 * deterministic, no-AI, plain-arithmetic design (`PROJECT_BRIEF.md`).
 * Distinct from the manual-entry bioimpedance fields on `DailyEntry`
 * (muscleMassKg etc.) — those can only be *measured* by a smart scale,
 * these two can be *derived* from data the app already has.
 */

/** Domain-level type, not defined in `stores/profileStore.ts` — `domain/`
 * must not depend on `stores/` (state/UI layer depends on domain, never
 * the other way around); `profileStore.ts` imports this instead. */
export type Sex = 'female' | 'male'

/** BMI = weight(kg) / height(m)². Standard formula, no age/sex needed. */
export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

/**
 * Basal metabolic rate via the Mifflin-St Jeor equation — the modern
 * standard replacement for the older Harris-Benedict formula, generally
 * considered more accurate for today's population. kcal/day at complete
 * rest, before any activity multiplier.
 */
export function calculateBmr(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}
