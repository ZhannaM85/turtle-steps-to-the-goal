export interface Goal {
  id: string
  startDate: string // ISO date
  startWeightKg: number
  targetWeightKg: number
  targetWeeklyLossKg: number // e.g. 1 — drives the weekly "small step"
  targetDate?: string // optional; if absent, derive from pace
  displayUnit: 'kg' | 'lb' // stored canonically in kg regardless
  createdAt: string
  updatedAt: string
}
