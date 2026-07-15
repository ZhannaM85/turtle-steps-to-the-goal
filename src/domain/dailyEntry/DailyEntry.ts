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
  /** Macros (#51) — all optional and independent of each other and of
   * amountKcal, same as note/emotion: a meal can log any subset. */
  proteinG?: number
  fatG?: number
  carbsG?: number
}

export interface DailyEntry {
  id: string
  date: string // ISO date, one entry per date
  weightKg?: number
  calorieEntries?: CalorieEntry[]
  note?: string
  /** Overall mood for the day as a whole, distinct from any meal's own emotion (#44). */
  emotion?: Emotion
  /** Sleep (#59) — both optional and independent, same as the rest of this
   * entity's fields. No cross-validation against sleepHours (e.g. a
   * wearable might report deep sleep before total for the same day). */
  sleepHours?: number
  deepSleepHours?: number
  /** Step count (#60) — optional, independent of everything else. */
  steps?: number
  /** Opt-in menstrual cycle tracking (#61) — only ever set when the user
   * has turned the feature on in Settings (`useCycleTrackingStore`); the
   * toggle itself is a local UI preference, not exported with backups, but
   * this logged value is a normal field on the entry like any other. */
  onPeriod?: boolean
  createdAt: string
  updatedAt: string
}
