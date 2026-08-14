/**
 * #719 — merge a day snippet into IndexedDB: fill empty fields, append
 * meals/water, never wipe the rest of the day. Overwrites only when the
 * caller passes those conflict fields after the confirm dialog.
 */
import type {
  CalorieEntry,
  CalorieItem,
  DailyEntry,
  DayTotals,
  WaterEntry,
} from '@/domain/dailyEntry'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { isLocalTransferEnabled, useDailyEntryStore } from '@/stores'
import type { DaySnippetMeal, DaySnippetPayload } from './daySnippetPayload'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

export const DAY_SNIPPET_SCALAR_FIELDS = [
  'weightKg',
  'note',
  'emotion',
  'sleepHours',
  'deepSleepHours',
  'steps',
  'onPeriod',
  'hadConstipation',
  'hadAlcohol',
  'nightEatingOverride',
  'dayTotals',
  'waistCm',
  'hipCm',
  'bodyFatPercent',
  'muscleMassKg',
  'visceralFatRating',
  'bodyWaterPercent',
  'boneMassKg',
] as const

export type DaySnippetScalarField = (typeof DAY_SNIPPET_SCALAR_FIELDS)[number]

export interface DaySnippetConflict {
  field: DaySnippetScalarField
  local: unknown
  incoming: unknown
}

export interface DaySnippetApplyPlan {
  date: string
  willCreate: boolean
  fills: Partial<Pick<DailyEntry, DaySnippetScalarField>>
  conflicts: DaySnippetConflict[]
  mealsToAppend: DaySnippetMeal[]
  mealsSkippedDuplicates: number
  waterToAppend: Array<{ amountMl: number }>
  waterSkippedDuplicates: number
}

export class LocalTransferDisabledError extends Error {
  constructor() {
    super('Local transfer is turned off')
    this.name = 'LocalTransferDisabledError'
  }
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a === undefined || b === undefined) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

function mealFingerprint(meal: {
  label?: string
  note?: string
  timeEaten?: string
  reaction?: string
  items: Array<{
    name?: string
    brand?: string
    amountKcal: number
    proteinG?: number
    fatG?: number
    carbsG?: number
    fiberG?: number
    sodiumMg?: number
    potassiumMg?: number
    magnesiumMg?: number
    amountG?: number
    emotion?: string
    noteText?: string
  }>
}): string {
  return JSON.stringify({
    label: meal.label ?? '',
    note: meal.note ?? '',
    timeEaten: meal.timeEaten ?? '',
    reaction: meal.reaction ?? '',
    items: meal.items.map((item) => ({
      name: item.name ?? '',
      brand: item.brand ?? '',
      amountKcal: item.amountKcal,
      proteinG: item.proteinG ?? null,
      fatG: item.fatG ?? null,
      carbsG: item.carbsG ?? null,
      fiberG: item.fiberG ?? null,
      sodiumMg: item.sodiumMg ?? null,
      potassiumMg: item.potassiumMg ?? null,
      magnesiumMg: item.magnesiumMg ?? null,
      amountG: item.amountG ?? null,
      emotion: item.emotion ?? '',
      noteText: item.noteText ?? '',
    })),
  })
}

function mintItem(item: DaySnippetMeal['items'][number]): CalorieItem {
  const next: CalorieItem = {
    id: crypto.randomUUID(),
    amountKcal: item.amountKcal,
  }
  if (item.name) next.name = item.name
  if (item.brand) next.brand = item.brand
  if (item.proteinG !== undefined) next.proteinG = item.proteinG
  if (item.fatG !== undefined) next.fatG = item.fatG
  if (item.carbsG !== undefined) next.carbsG = item.carbsG
  if (item.fiberG !== undefined) next.fiberG = item.fiberG
  if (item.sodiumMg !== undefined) next.sodiumMg = item.sodiumMg
  if (item.potassiumMg !== undefined) next.potassiumMg = item.potassiumMg
  if (item.magnesiumMg !== undefined) next.magnesiumMg = item.magnesiumMg
  if (item.amountG !== undefined) next.amountG = item.amountG
  if (item.emotion) next.emotion = item.emotion
  if (item.noteText) next.noteText = item.noteText
  return next
}

function mintMeal(meal: DaySnippetMeal, createdAt: string): CalorieEntry {
  const next: CalorieEntry = {
    id: crypto.randomUUID(),
    createdAt,
    items: meal.items.map(mintItem),
  }
  if (meal.label) next.label = meal.label
  if (meal.note) next.note = meal.note
  if (meal.timeEaten) next.timeEaten = meal.timeEaten
  if (meal.reaction) next.reaction = meal.reaction
  return next
}

export function planDaySnippetApply(
  payload: DaySnippetPayload,
  existing: DailyEntry | undefined,
): DaySnippetApplyPlan {
  const fills: DaySnippetApplyPlan['fills'] = {}
  const conflicts: DaySnippetConflict[] = []

  for (const field of DAY_SNIPPET_SCALAR_FIELDS) {
    const incoming = payload[field]
    if (incoming === undefined) continue
    const local = existing?.[field]
    if (local === undefined) {
      if (field === 'dayTotals') {
        fills.dayTotals = incoming as DayTotals
      } else {
        Object.assign(fills, { [field]: incoming })
      }
      continue
    }
    if (!valuesEqual(local, incoming)) {
      conflicts.push({ field, local, incoming })
    }
  }

  const existingMeals = existing?.calorieEntries ?? []
  const existingMealKeys = new Set(existingMeals.map((meal) => mealFingerprint(meal)))
  const mealsToAppend: DaySnippetMeal[] = []
  let mealsSkippedDuplicates = 0
  for (const meal of payload.calorieEntries ?? []) {
    if (existingMealKeys.has(mealFingerprint(meal))) {
      mealsSkippedDuplicates += 1
      continue
    }
    mealsToAppend.push(meal)
    existingMealKeys.add(mealFingerprint(meal))
  }

  const existingWater = existing?.waterEntries ?? []
  const existingWaterKeys = new Set(existingWater.map((w) => w.amountMl))
  const waterToAppend: Array<{ amountMl: number }> = []
  let waterSkippedDuplicates = 0
  for (const water of payload.waterEntries ?? []) {
    if (existingWaterKeys.has(water.amountMl)) {
      waterSkippedDuplicates += 1
      continue
    }
    waterToAppend.push(water)
    existingWaterKeys.add(water.amountMl)
  }

  return {
    date: payload.date,
    willCreate: !existing,
    fills,
    conflicts,
    mealsToAppend,
    mealsSkippedDuplicates,
    waterToAppend,
    waterSkippedDuplicates,
  }
}

export function applyDaySnippetPlan(
  existing: DailyEntry | undefined,
  payload: DaySnippetPayload,
  plan: DaySnippetApplyPlan,
  overwriteFields: ReadonlySet<DaySnippetScalarField>,
): DailyEntry {
  const now = new Date().toISOString()
  const base: DailyEntry = existing
    ? { ...existing }
    : {
        id: crypto.randomUUID(),
        date: payload.date,
        createdAt: now,
        updatedAt: now,
      }

  const next: DailyEntry = { ...base, updatedAt: now }
  Object.assign(next, plan.fills)
  for (const conflict of plan.conflicts) {
    if (overwriteFields.has(conflict.field)) {
      Object.assign(next, { [conflict.field]: conflict.incoming })
    }
  }

  if (plan.mealsToAppend.length > 0) {
    next.calorieEntries = [
      ...(next.calorieEntries ?? []),
      ...plan.mealsToAppend.map((meal) => mintMeal(meal, now)),
    ]
  }
  if (plan.waterToAppend.length > 0) {
    const minted: WaterEntry[] = plan.waterToAppend.map((water) => ({
      id: crypto.randomUUID(),
      amountMl: water.amountMl,
    }))
    next.waterEntries = [...(next.waterEntries ?? []), ...minted]
  }

  return next
}

export async function applyDaySnippet(
  payload: DaySnippetPayload,
  options?: { overwriteFields?: Iterable<DaySnippetScalarField> },
): Promise<{ plan: DaySnippetApplyPlan; entry: DailyEntry }> {
  if (!isLocalTransferEnabled()) {
    throw new LocalTransferDisabledError()
  }

  const existing = await dailyEntryRepository.getByDate(payload.date)
  const plan = planDaySnippetApply(payload, existing)
  const overwriteFields = new Set(options?.overwriteFields ?? [])
  const entry = applyDaySnippetPlan(existing, payload, plan, overwriteFields)
  await dailyEntryRepository.upsert(entry)

  const viewing = useDailyEntryStore.getState()
  if (viewing.date === entry.date) {
    await viewing.loadEntry(entry.date)
  }

  return { plan, entry }
}
