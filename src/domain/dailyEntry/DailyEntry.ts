export type Emotion = 'happy' | 'unhappy' | 'neutral'

export interface CalorieEntry {
  id: string
  amountKcal: number
  note?: string
  emotion?: Emotion
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
