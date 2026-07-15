/** The day's overall mood (DailyEntry.emotion) — unchanged by #54. */
export type Emotion = 'happy' | 'unhappy' | 'neutral'

/** A single meal's reaction (#54) — deliberately a different, smaller-stakes
 * set than the day's overall mood: thumbs up/down plus "bellissimo" (a
 * chef's-kiss "this was amazing" tier above thumbs up). */
export type MealEmotion = 'thumbsUp' | 'thumbsDown' | 'bellissimo'

export interface CalorieEntry {
  id: string
  amountKcal: number
  note?: string
  emotion?: MealEmotion
  createdAt: string
}

export interface DailyEntry {
  id: string
  date: string // ISO date, one entry per date
  weightKg?: number
  calorieEntries?: CalorieEntry[]
  note?: string
  /** Overall mood for the day as a whole, distinct from any meal's own emotion (#44). */
  emotion?: Emotion
  createdAt: string
  updatedAt: string
}
