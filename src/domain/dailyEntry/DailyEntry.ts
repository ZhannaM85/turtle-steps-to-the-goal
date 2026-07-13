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
  createdAt: string
  updatedAt: string
}
