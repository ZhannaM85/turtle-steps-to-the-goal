/**
 * Latest clock time treated as a late-night tail of the same `DailyEntry`.
 * Meals before 06:00 sort and count after that day's evening meals (a 01:22
 * snack logged on the open day page follows 19:41). Times at or after 06:00
 * stay morning — an 08:27 breakfast is not wrapped onto the next day
 * (#755/#756). There is no user-facing day-start setting (#984); "today"
 * is the real calendar date.
 */
export const OVERNIGHT_WRAP_BEFORE_MINUTES = 6 * 60

/**
 * A clock time before 06:00 reads as the late-night tail of the same day,
 * not as an early morning. Shifting it forward by a full day restores its
 * place relative to that day's other times. Returned value is minutes
 * since midnight (may exceed 24h).
 */
export function adjustForDayStart(minutes: number): number {
  return minutes < OVERNIGHT_WRAP_BEFORE_MINUTES ? minutes + 24 * 60 : minutes
}
