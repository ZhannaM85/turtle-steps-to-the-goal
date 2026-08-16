/**
 * #718 — compact one-day DailyEntry snippet for another Turtle Steps copy
 * (#717). Not a meal row, not a food-library share (#661), not a full
 * backup: one calendar date’s log (sleep, weight, meals, water, …).
 *
 * Wire format omits entry/meal/item/water ids (#719 mints new ones).
 * Same JSON → base64url transport as #661 (`shareFood`).
 *
 * QR budget: encoded payload (not the full URL) should stay under
 * `DAY_SNIPPET_QR_MAX_ENCODED_CHARS` for a phone camera. #722 must fall
 * back to copy/share if over.
 */
import { z } from 'zod'
import type {
  CalorieEntry,
  CalorieItem,
  DailyEntry,
  DayTotals,
  Emotion,
  MealEmotion,
  WaterEntry,
} from '@/domain/dailyEntry'

export const SHARE_DAY_QUERY_PARAM = 'shareDay'

/** Soft cap for a scannable QR of the encoded payload alone. */
export const DAY_SNIPPET_QR_MAX_ENCODED_CHARS = 1200

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const mealEmotionSchema = z.enum(['thumbsUp', 'thumbsDown', 'bellissimo'])
const dayEmotionSchema = z.enum(['happy', 'unhappy', 'neutral'])

const daySnippetItemSchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  amountKcal: z.number(),
  proteinG: z.number().optional(),
  fatG: z.number().optional(),
  carbsG: z.number().optional(),
  fiberG: z.number().optional(),
  sodiumMg: z.number().optional(),
  potassiumMg: z.number().optional(),
  magnesiumMg: z.number().optional(),
  amountG: z.number().optional(),
  emotion: mealEmotionSchema.optional(),
  noteText: z.string().min(1).optional(),
})

const daySnippetMealSchema = z.object({
  label: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
  timeEaten: z.string().min(1).optional(),
  reaction: dayEmotionSchema.optional(),
  items: z.array(daySnippetItemSchema).min(1),
})

const daySnippetWaterSchema = z.object({
  amountMl: z.number(),
})

const daySnippetTotalsSchema = z.object({
  amountKcal: z.number(),
  proteinG: z.number().optional(),
  fatG: z.number().optional(),
  carbsG: z.number().optional(),
  fiberG: z.number().optional(),
})

export const daySnippetPayloadSchema = z.object({
  v: z.literal(1),
  kind: z.literal('day'),
  createdAt: z.string().min(1),
  sender: z.string().min(1).max(32).optional(),
  date: isoDateSchema,
  weightKg: z.number().optional(),
  calorieEntries: z.array(daySnippetMealSchema).optional(),
  dayTotals: daySnippetTotalsSchema.optional(),
  note: z.string().min(1).optional(),
  emotion: dayEmotionSchema.optional(),
  sleepHours: z.number().optional(),
  deepSleepHours: z.number().optional(),
  steps: z.number().optional(),
  onPeriod: z.boolean().optional(),
  hadConstipation: z.boolean().optional(),
  hadAlcohol: z.boolean().optional(),
  nightEatingOverride: z.boolean().optional(),
  waterEntries: z.array(daySnippetWaterSchema).optional(),
  waistCm: z.number().optional(),
  hipCm: z.number().optional(),
  bodyFatPercent: z.number().optional(),
  muscleMassKg: z.number().optional(),
  visceralFatRating: z.number().optional(),
  bodyWaterPercent: z.number().optional(),
  boneMassKg: z.number().optional(),
})

export type DaySnippetPayload = z.infer<typeof daySnippetPayloadSchema>
export type DaySnippetMeal = z.infer<typeof daySnippetMealSchema>
export type DaySnippetItem = z.infer<typeof daySnippetItemSchema>
export type DaySnippetWater = z.infer<typeof daySnippetWaterSchema>

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(encoded: string): Uint8Array {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (padded.length % 4)) % 4
  const withPad = padded + '='.repeat(padLength)
  const binary = atob(withPad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function looksLikeFullBackup(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return Array.isArray(record.goals) && Array.isArray(record.dailyEntries)
}

export function encodeDaySnippetPayload(payload: DaySnippetPayload): string {
  const json = JSON.stringify(daySnippetPayloadSchema.parse(payload))
  return bytesToBase64Url(new TextEncoder().encode(json))
}

export function decodeDaySnippetPayload(
  encoded: string,
): DaySnippetPayload | null {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encoded.trim()))
    const parsed: unknown = JSON.parse(json)
    if (looksLikeFullBackup(parsed)) return null
    const result = daySnippetPayloadSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function daySnippetFitsQr(encoded: string): boolean {
  return encoded.length <= DAY_SNIPPET_QR_MAX_ENCODED_CHARS
}

function compactItem(item: CalorieItem): DaySnippetItem {
  const compact: DaySnippetItem = { amountKcal: item.amountKcal }
  if (item.name) compact.name = item.name
  if (item.brand) compact.brand = item.brand
  if (item.proteinG !== undefined) compact.proteinG = item.proteinG
  if (item.fatG !== undefined) compact.fatG = item.fatG
  if (item.carbsG !== undefined) compact.carbsG = item.carbsG
  if (item.fiberG !== undefined) compact.fiberG = item.fiberG
  if (item.sodiumMg !== undefined) compact.sodiumMg = item.sodiumMg
  if (item.potassiumMg !== undefined) compact.potassiumMg = item.potassiumMg
  if (item.magnesiumMg !== undefined) compact.magnesiumMg = item.magnesiumMg
  if (item.amountG !== undefined) compact.amountG = item.amountG
  if (item.emotion) compact.emotion = item.emotion as MealEmotion
  if (item.noteText) compact.noteText = item.noteText
  return compact
}

function compactMeal(entry: CalorieEntry): DaySnippetMeal | null {
  const items = entry.items.map(compactItem)
  if (items.length === 0) return null
  const meal: DaySnippetMeal = { items }
  if (entry.label) meal.label = entry.label
  if (entry.note) meal.note = entry.note
  if (entry.timeEaten) meal.timeEaten = entry.timeEaten
  if (entry.reaction) meal.reaction = entry.reaction as Emotion
  return meal
}

function compactDayTotals(totals: DayTotals): DaySnippetPayload['dayTotals'] {
  const compact: NonNullable<DaySnippetPayload['dayTotals']> = {
    amountKcal: totals.amountKcal,
  }
  if (totals.proteinG !== undefined) compact.proteinG = totals.proteinG
  if (totals.fatG !== undefined) compact.fatG = totals.fatG
  if (totals.carbsG !== undefined) compact.carbsG = totals.carbsG
  if (totals.fiberG !== undefined) compact.fiberG = totals.fiberG
  return compact
}

const ENVELOPE_KEYS = new Set(['v', 'kind', 'createdAt', 'sender', 'date'])

export function daySnippetHasSendableContent(
  payload: DaySnippetPayload,
): boolean {
  return Object.keys(payload).some((key) => !ENVELOPE_KEYS.has(key))
}

export function dailyEntryToDaySnippet(
  entry: DailyEntry,
  options?: { sender?: string; createdAt?: string },
): DaySnippetPayload {
  const payload: DaySnippetPayload = {
    v: 1,
    kind: 'day',
    // #741 — must be stable across calls for the same entry. Wall-clock
    // `new Date()` made `shareDay` (and the QR) a new string every render,
    // so the send sheet re-encoded in a loop, flickered, then froze.
    createdAt: options?.createdAt ?? entry.updatedAt ?? entry.createdAt,
    date: entry.date,
  }
  if (options?.sender) payload.sender = options.sender
  if (entry.weightKg !== undefined) payload.weightKg = entry.weightKg
  if (entry.calorieEntries && entry.calorieEntries.length > 0) {
    const meals = entry.calorieEntries
      .map(compactMeal)
      .filter((meal): meal is DaySnippetMeal => meal !== null)
    if (meals.length > 0) payload.calorieEntries = meals
  }
  if (entry.dayTotals) payload.dayTotals = compactDayTotals(entry.dayTotals)
  if (entry.note) payload.note = entry.note
  if (entry.emotion) payload.emotion = entry.emotion
  if (entry.sleepHours !== undefined) payload.sleepHours = entry.sleepHours
  if (entry.deepSleepHours !== undefined) {
    payload.deepSleepHours = entry.deepSleepHours
  }
  if (entry.steps !== undefined) payload.steps = entry.steps
  if (entry.onPeriod !== undefined) payload.onPeriod = entry.onPeriod
  if (entry.hadConstipation !== undefined) {
    payload.hadConstipation = entry.hadConstipation
  }
  if (entry.hadAlcohol !== undefined) payload.hadAlcohol = entry.hadAlcohol
  if (entry.nightEatingOverride !== undefined) {
    payload.nightEatingOverride = entry.nightEatingOverride
  }
  if (entry.waterEntries && entry.waterEntries.length > 0) {
    payload.waterEntries = entry.waterEntries.map((water: WaterEntry) => ({
      amountMl: water.amountMl,
    }))
  }
  if (entry.waistCm !== undefined) payload.waistCm = entry.waistCm
  if (entry.hipCm !== undefined) payload.hipCm = entry.hipCm
  if (entry.bodyFatPercent !== undefined) {
    payload.bodyFatPercent = entry.bodyFatPercent
  }
  if (entry.muscleMassKg !== undefined) payload.muscleMassKg = entry.muscleMassKg
  if (entry.visceralFatRating !== undefined) {
    payload.visceralFatRating = entry.visceralFatRating
  }
  if (entry.bodyWaterPercent !== undefined) {
    payload.bodyWaterPercent = entry.bodyWaterPercent
  }
  if (entry.boneMassKg !== undefined) payload.boneMassKg = entry.boneMassKg

  return daySnippetPayloadSchema.parse(payload)
}

export function parseDaySnippetFromText(
  text: string,
): DaySnippetPayload | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    const param = url.searchParams.get(SHARE_DAY_QUERY_PARAM)
    if (param) return decodeDaySnippetPayload(param)
  } catch {
    // Not a URL.
  }

  const queryMatch = /(?:^|[?&])shareDay=([^&#]+)/.exec(trimmed)
  if (queryMatch?.[1]) {
    try {
      return decodeDaySnippetPayload(decodeURIComponent(queryMatch[1]))
    } catch {
      return decodeDaySnippetPayload(queryMatch[1])
    }
  }

  return decodeDaySnippetPayload(trimmed)
}

export function buildDaySnippetUrl(
  payload: DaySnippetPayload,
  options?: { origin?: string; baseUrl?: string },
): string {
  const origin = options?.origin ?? window.location.origin
  const baseUrl = options?.baseUrl ?? import.meta.env.BASE_URL
  const url = new URL(baseUrl, origin)
  url.searchParams.set(SHARE_DAY_QUERY_PARAM, encodeDaySnippetPayload(payload))
  return url.toString()
}
