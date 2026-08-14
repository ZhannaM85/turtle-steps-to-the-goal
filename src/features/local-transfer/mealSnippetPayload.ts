/**
 * #718 — compact logged-meal snippet for another Turtle Steps copy (#717).
 * Not a full backup: one grouped meal on one calendar date. Same transport
 * idea as #661 (`shareFood`): JSON → base64url in a query param / QR.
 *
 * Wire format omits meal/item ids (#719 mints new ones on apply).
 *
 * QR budget: encoded payload (not the full URL) should stay under
 * `MEAL_SNIPPET_QR_MAX_ENCODED_CHARS` for a phone camera. #722 must fall
 * back to copy/share if over.
 */
import { z } from 'zod'
import type { CalorieEntry, CalorieItem, Emotion, MealEmotion } from '@/domain/dailyEntry'

export const SHARE_MEAL_QUERY_PARAM = 'shareMeal'

/** Soft cap for a scannable QR of the encoded payload alone. */
export const MEAL_SNIPPET_QR_MAX_ENCODED_CHARS = 1200

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const mealEmotionSchema = z.enum(['thumbsUp', 'thumbsDown', 'bellissimo'])
const dayEmotionSchema = z.enum(['happy', 'unhappy', 'neutral'])

const mealSnippetItemSchema = z.object({
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

const mealSnippetMealSchema = z.object({
  label: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
  timeEaten: z.string().min(1).optional(),
  reaction: dayEmotionSchema.optional(),
  items: z.array(mealSnippetItemSchema).min(1),
})

export const mealSnippetPayloadSchema = z.object({
  v: z.literal(1),
  kind: z.literal('meal'),
  createdAt: z.string().min(1),
  sender: z.string().min(1).max(32).optional(),
  date: isoDateSchema,
  meal: mealSnippetMealSchema,
})

export type MealSnippetPayload = z.infer<typeof mealSnippetPayloadSchema>
export type MealSnippetItem = z.infer<typeof mealSnippetItemSchema>

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

export function encodeMealSnippetPayload(payload: MealSnippetPayload): string {
  const json = JSON.stringify(mealSnippetPayloadSchema.parse(payload))
  return bytesToBase64Url(new TextEncoder().encode(json))
}

export function decodeMealSnippetPayload(
  encoded: string,
): MealSnippetPayload | null {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encoded.trim()))
    const parsed: unknown = JSON.parse(json)
    if (looksLikeFullBackup(parsed)) return null
    const result = mealSnippetPayloadSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function mealSnippetFitsQr(encoded: string): boolean {
  return encoded.length <= MEAL_SNIPPET_QR_MAX_ENCODED_CHARS
}

function compactItem(item: CalorieItem): MealSnippetItem {
  const compact: MealSnippetItem = { amountKcal: item.amountKcal }
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

export function calorieEntryToMealSnippet(
  entry: CalorieEntry,
  date: string,
  options?: { sender?: string; createdAt?: string },
): MealSnippetPayload {
  const meal: MealSnippetPayload['meal'] = {
    items: entry.items.map(compactItem),
  }
  if (entry.label) meal.label = entry.label
  if (entry.note) meal.note = entry.note
  if (entry.timeEaten) meal.timeEaten = entry.timeEaten
  if (entry.reaction) meal.reaction = entry.reaction as Emotion

  const payload: MealSnippetPayload = {
    v: 1,
    kind: 'meal',
    createdAt: options?.createdAt ?? new Date().toISOString(),
    date,
    meal,
  }
  if (options?.sender) payload.sender = options.sender
  return mealSnippetPayloadSchema.parse(payload)
}

export function parseMealSnippetFromText(
  text: string,
): MealSnippetPayload | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    const param = url.searchParams.get(SHARE_MEAL_QUERY_PARAM)
    if (param) return decodeMealSnippetPayload(param)
  } catch {
    // Not a URL.
  }

  const queryMatch = /(?:^|[?&])shareMeal=([^&#]+)/.exec(trimmed)
  if (queryMatch?.[1]) {
    try {
      return decodeMealSnippetPayload(decodeURIComponent(queryMatch[1]))
    } catch {
      return decodeMealSnippetPayload(queryMatch[1])
    }
  }

  return decodeMealSnippetPayload(trimmed)
}

export function buildMealSnippetUrl(
  payload: MealSnippetPayload,
  options?: { origin?: string; baseUrl?: string },
): string {
  const origin = options?.origin ?? window.location.origin
  const baseUrl = options?.baseUrl ?? import.meta.env.BASE_URL
  const url = new URL(baseUrl, origin)
  url.searchParams.set(SHARE_MEAL_QUERY_PARAM, encodeMealSnippetPayload(payload))
  return url.toString()
}
