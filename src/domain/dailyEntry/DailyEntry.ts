export interface DailyEntry {
  id: string
  date: string // ISO date, one entry per date
  weightKg?: number
  caloriesConsumed?: number
  note?: string
  createdAt: string
  updatedAt: string
}
