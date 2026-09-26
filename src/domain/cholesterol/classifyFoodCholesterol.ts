import { foods } from '@/data/foods'
import { normalizeTextSpaces } from '@/shared/lib/normalizeTextSpaces'
import {
  isCholesterolImpact,
  type CholesterolClassification,
  type CholesterolImpact,
} from './cholesterolTypes'

/**
 * Conservative name key: Unicode spaces → ASCII, trim, collapse runs of
 * whitespace, case-fold. Not a fuzzy match — the whole name still has to
 * line up after that.
 */
export function cholesterolMatchKey(name: string): string {
  return normalizeTextSpaces(name).trim().replace(/\s+/g, ' ').toLowerCase()
}

interface IndexedFood {
  name: string
  cholesterolImpact: CholesterolImpact
  cholesterolReason?: string
}

type NameIndex = {
  byExact: Map<string, IndexedFood | 'ambiguous'>
  byKey: Map<string, IndexedFood | 'ambiguous'>
}

function addLabel(index: NameIndex, label: string, row: IndexedFood): void {
  const exactPrev = index.byExact.get(label)
  index.byExact.set(label, exactPrev ? 'ambiguous' : row)
  const key = cholesterolMatchKey(label)
  const keyPrev = index.byKey.get(key)
  if (!keyPrev) index.byKey.set(key, row)
  else if (keyPrev === 'ambiguous' || keyPrev.name !== row.name) {
    index.byKey.set(key, 'ambiguous')
  }
}

/** Catalog rows that carry LDL. Russian name is canonical; the English
 * label finds the same record. Names without a label are not indexed. */
function indexCatalog(): NameIndex {
  const index: NameIndex = { byExact: new Map(), byKey: new Map() }
  for (const food of foods) {
    if (!food.ru || !food.cholesterolImpact) continue
    if (!isCholesterolImpact(food.cholesterolImpact)) continue
    const row: IndexedFood = {
      name: food.ru,
      cholesterolImpact: food.cholesterolImpact,
    }
    const reason = food.cholesterolReason?.trim()
    if (reason) row.cholesterolReason = reason
    addLabel(index, food.ru, row)
    if (food.en && food.en !== food.ru) addLabel(index, food.en, row)
  }
  return index
}

const catalogIndex = indexCatalog()

function toClassification(food: IndexedFood): CholesterolClassification {
  if (!food.cholesterolReason) {
    return { cholesterolImpact: food.cholesterolImpact }
  }
  return {
    cholesterolImpact: food.cholesterolImpact,
    cholesterolReason: food.cholesterolReason,
  }
}

const UNKNOWN: CholesterolClassification = { cholesterolImpact: 'unknown' }

function lookup(index: NameIndex, name: string): IndexedFood | undefined {
  const exact = index.byExact.get(name)
  if (exact && exact !== 'ambiguous') return exact
  const trimmed = name.trim()
  if (trimmed !== name) {
    const exactTrimmed = index.byExact.get(trimmed)
    if (exactTrimmed && exactTrimmed !== 'ambiguous') return exactTrimmed
  }
  const keyed = index.byKey.get(cholesterolMatchKey(name))
  if (keyed && keyed !== 'ambiguous') return keyed
  return undefined
}

/**
 * LDL for a name comes from the food catalog only (#1011). A key that
 * collapses two different names is ignored. Anything the catalog does not
 * label is `unknown` with no reason — including a diary name that used to
 * live only on the removed cholesterol list. A stamp already stored on
 * that row is left alone by the backfill.
 */
export function classifyFoodName(
  name: string | undefined,
): CholesterolClassification {
  if (!name || !cholesterolMatchKey(name)) return UNKNOWN
  const fromCatalog = lookup(catalogIndex, name)
  if (fromCatalog) return toClassification(fromCatalog)
  return UNKNOWN
}
