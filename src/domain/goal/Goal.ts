export interface Goal {
  id: string
  targetWeeklyLossKg: number // e.g. 1 — this week's target, renewed/edited week to week
  displayUnit: 'kg' | 'lb' // stored canonically in kg regardless
  createdAt: string
  updatedAt: string
}
