import type { FoodItem } from '@/data/foods'
import type { MealItem } from '@/domain/mealItem'
import {
  collapseCatalogName,
  normalizeCatalogBarcode,
  type CatalogFoodDraft,
  type CatalogFoodImport,
} from './CatalogFoodImport'

function folded(name: string): string {
  return collapseCatalogName(name).toLowerCase()
}

/** Catalog `ru` when this name is already a row; otherwise the pasted name. */
export function canonicalCatalogName(
  nameRu: string,
  catalog: readonly { ru: string }[],
): string {
  const normalized = collapseCatalogName(nameRu)
  const exact = catalog.find((food) => collapseCatalogName(food.ru) === normalized)
  if (exact) return exact.ru
  const matches = catalog.filter((food) => folded(food.ru) === folded(normalized))
  if (matches.length === 1 && matches[0]) return matches[0].ru
  return normalized
}

function catalogIndex(
  catalog: readonly { ru: string }[],
  nameRu: string,
): number {
  const normalized = collapseCatalogName(nameRu)
  const exact = catalog.findIndex(
    (food) => collapseCatalogName(food.ru) === normalized,
  )
  if (exact !== -1) return exact
  const matches = catalog
    .map((food, index) => ({ food, index }))
    .filter(({ food }) => folded(food.ru) === folded(normalized))
  return matches.length === 1 && matches[0] ? matches[0].index : -1
}

function barcodeIndex(catalog: readonly { barcode?: string }[], barcode: string): number {
  const code = normalizeCatalogBarcode(barcode)
  if (!code) return -1
  return catalog.findIndex(
    (food) => normalizeCatalogBarcode(food.barcode) === code,
  )
}

function overlay(food: FoodItem, row: CatalogFoodImport): FoodItem {
  const next: FoodItem = {
    ...food,
    kcal100: row.kcal100,
    protein100: row.protein100,
    fat100: row.fat100,
    carbs100: row.carbs100,
    cholesterolImpact: row.cholesterolImpact,
  }
  if (row.cholesterolReason) next.cholesterolReason = row.cholesterolReason
  else delete next.cholesterolReason
  const barcode = normalizeCatalogBarcode(row.barcode)
  if (barcode) next.barcode = barcode
  if (row.brand) next.brand = row.brand
  return next
}

function applyImport(
  food: FoodItem,
  row: CatalogFoodImport,
  matchedByBarcode: boolean,
): FoodItem {
  const next = overlay(food, row)
  // A pasted package can rename a food the user added. A curated row keeps
  // its name so a barcode does not retitle a staple.
  if (matchedByBarcode && food.id.startsWith('user-catalog-')) {
    next.ru = row.nameRu
    if (row.nameEn) next.en = row.nameEn
  }
  return next
}

function appendedFood(row: CatalogFoodImport): FoodItem {
  const barcode = normalizeCatalogBarcode(row.barcode)
  const food: FoodItem = {
    id: barcode
      ? `user-catalog-bc-${encodeURIComponent(barcode)}`
      : `user-catalog-${encodeURIComponent(row.nameRu)}`,
    en: row.nameEn ?? row.nameRu,
    ru: row.nameRu,
    kcal100: row.kcal100,
    protein100: row.protein100,
    fat100: row.fat100,
    carbs100: row.carbs100,
    cholesterolImpact: row.cholesterolImpact,
  }
  if (row.cholesterolReason) food.cholesterolReason = row.cholesterolReason
  if (barcode) food.barcode = barcode
  if (row.brand) food.brand = row.brand
  return food
}

/**
 * #1015 — paste updates the catalog row with that Russian name. A name
 * the catalog does not have is appended once. An empty import list
 * returns the same array so existing search identity checks stay put.
 * #1027 — a barcode matches first, including a different Russian name.
 */
export function mergeCatalogFoodImports(
  catalog: readonly FoodItem[],
  imports: readonly CatalogFoodImport[],
): FoodItem[] {
  if (imports.length === 0) return catalog as FoodItem[]
  const next = catalog.slice()
  for (const row of imports) {
    const byBarcode = row.barcode ? barcodeIndex(next, row.barcode) : -1
    const index = byBarcode !== -1 ? byBarcode : catalogIndex(next, row.nameRu)
    if (index === -1) {
      next.push(appendedFood(row))
      continue
    }
    const current = next[index]
    if (current) next[index] = applyImport(current, row, byBarcode !== -1)
  }
  return next
}

function storedRow(draft: CatalogFoodDraft, updatedAt: string): CatalogFoodImport {
  const row: CatalogFoodImport = {
    nameRu: draft.nameRu,
    kcal100: draft.kcal100,
    protein100: draft.protein100,
    fat100: draft.fat100,
    carbs100: draft.carbs100,
    cholesterolImpact: draft.cholesterolImpact,
    updatedAt,
  }
  if (draft.nameEn) row.nameEn = draft.nameEn
  if (draft.cholesterolReason) row.cholesterolReason = draft.cholesterolReason
  if (draft.cholesterolReasonEn) row.cholesterolReasonEn = draft.cholesterolReasonEn
  const barcode = normalizeCatalogBarcode(draft.barcode)
  if (barcode) row.barcode = barcode
  if (draft.brand) row.brand = draft.brand
  return row
}

export interface CatalogFoodWritePlan {
  deleteNames: string[]
  upserts: CatalogFoodImport[]
  added: number
  updated: number
}

/**
 * #1027 — one stored import per barcode. A code already on a row updates
 * that row; otherwise the Russian name does. A name-only paste keeps a
 * barcode the row already had.
 */
export function planCatalogFoodUpserts(
  existing: readonly CatalogFoodImport[],
  drafts: readonly CatalogFoodDraft[],
  catalog: readonly { ru: string }[],
  updatedAt: string,
): CatalogFoodWritePlan {
  const rows = existing.map((row) => ({ ...row }))
  const deleteNames: string[] = []
  const touched = new Set<string>()
  let added = 0
  let updated = 0
  // #1035 — later rows in one paste are newer, so «Недавние» can put the
  // last imported food first. A single draft keeps the caller's timestamp.
  const baseMs = Date.parse(updatedAt)

  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index]
    if (!draft) continue
    const rowUpdatedAt = Number.isNaN(baseMs)
      ? updatedAt
      : new Date(baseMs + index).toISOString()
    const nameRu = canonicalCatalogName(draft.nameRu, catalog)
    const barcode = normalizeCatalogBarcode(draft.barcode)
    const prepared: CatalogFoodDraft = { ...draft, nameRu }
    if (barcode) prepared.barcode = barcode
    else delete prepared.barcode

    const byBarcode = barcode ? barcodeIndex(rows, barcode) : -1
    const byName = rows.findIndex((row) => row.nameRu === nameRu)
    const indexInRows = byBarcode !== -1 ? byBarcode : byName
    if (indexInRows === -1) {
      const created = storedRow(prepared, rowUpdatedAt)
      rows.push(created)
      touched.add(created.nameRu)
      added += 1
      continue
    }

    const current = rows[indexInRows]
    if (!current) continue
    let key = current.nameRu
    const nextNameIsFree =
      byBarcode !== -1 &&
      nameRu !== current.nameRu &&
      catalogIndex(catalog, current.nameRu) === -1 &&
      catalogIndex(catalog, nameRu) === -1 &&
      !rows.some((row, rowIndex) => rowIndex !== indexInRows && row.nameRu === nameRu)
    if (nextNameIsFree) {
      deleteNames.push(current.nameRu)
      touched.delete(current.nameRu)
      rows.splice(indexInRows, 1)
      key = nameRu
    }
    const next = storedRow(
      {
        ...prepared,
        nameRu: key,
        nameEn: prepared.nameEn ?? current.nameEn,
        barcode: barcode ?? current.barcode,
        brand: prepared.brand ?? current.brand,
      },
      rowUpdatedAt,
    )
    if (key === current.nameRu) rows[indexInRows] = next
    else rows.push(next)
    touched.add(next.nameRu)
    updated += 1
  }

  return {
    deleteNames: deleteNames.filter((name) => !touched.has(name)),
    upserts: rows.filter((row) => touched.has(row.nameRu)),
    added,
    updated,
  }
}

/**
 * #1027 — a pasted barcode that is already on a library food updates that
 * food. It does not add a second library row.
 */
export function mealItemUpdatedByCatalogBarcode(
  items: readonly MealItem[],
  row: Pick<CatalogFoodDraft, 'nameRu' | 'barcode' | 'brand'>,
  updatedAt: string,
): MealItem | undefined {
  const code = normalizeCatalogBarcode(row.barcode)
  if (!code) return undefined
  const item = items.find(
    (entry) => normalizeCatalogBarcode(entry.barcode) === code,
  )
  if (!item) return undefined
  const nextName = collapseCatalogName(row.nameRu)
  const nameTaken = items.some(
    (entry) =>
      entry.id !== item.id && folded(entry.name) === folded(nextName),
  )
  const name = nameTaken ? item.name : nextName
  const brand = row.brand ?? item.brand
  if (name === item.name && brand === item.brand) return undefined
  const next: MealItem = { ...item, name, updatedAt }
  if (brand) next.brand = brand
  else delete next.brand
  return next
}
