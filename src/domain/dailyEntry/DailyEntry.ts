/** The day's overall mood (DailyEntry.emotion) — unchanged by #54. */
export type Emotion = 'happy' | 'unhappy' | 'neutral'

/** A single meal's reaction (#54) — deliberately a different, smaller-stakes
 * set than the day's overall mood: thumbs up/down plus "bellissimo" (a
 * chef's-kiss "this was amazing" tier above thumbs up). */
export type MealEmotion = 'thumbsUp' | 'thumbsDown' | 'bellissimo'

/**
 * One food/dish within a meal (#81) — e.g. "soup", "bread", "cheese" all
 * eaten together at lunch. A meal (`CalorieEntry`) groups 1+ of these;
 * note/mood/time-eaten are shared at the group level, not per item (see
 * `CalorieEntry` below).
 */
export interface CalorieItem {
  id: string
  name?: string
  amountKcal: number
  proteinG?: number
  fatG?: number
  carbsG?: number
}

export interface CalorieEntry {
  id: string
  /** Always at least one item — a group with its last item removed is
   * itself removed, not left empty. */
  items: CalorieItem[]
  note?: string
  emotion?: MealEmotion
  createdAt: string
  /** Time of day the meal was eaten (#65), "HH:MM" 24-hour, e.g. "07:30" —
   * for intermittent-fasting tracking. Time-of-day only, not a full
   * date+time: a meal already belongs to a specific day via its parent
   * DailyEntry. Optional and independently clearable; deliberately NOT
   * cleared or recomputed when meals are reordered (drag-and-drop, #36) —
   * clearing a user-entered time as a side effect of reordering would be a
   * surprising data loss. */
  timeEaten?: string
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
