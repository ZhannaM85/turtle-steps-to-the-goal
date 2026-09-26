import seedFile from '@/data/cholesterol-foods.json'
import { foods } from '@/data/foods'
import { normalizeTextSpaces } from '@/shared/lib/normalizeTextSpaces'
import {
  isCholesterolImpact,
  type CholesterolClassification,
  type CholesterolImpact,
  type CholesterolSeedFile,
} from './cholesterolTypes'

const seed = seedFile as CholesterolSeedFile

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

function indexSeed(file: CholesterolSeedFile): NameIndex {
  const index: NameIndex = { byExact: new Map(), byKey: new Map() }
  for (const food of file.foods) {
    if (!food.name || !isCholesterolImpact(food.cholesterolImpact)) continue
    const row: IndexedFood = {
      name: food.name,
      cholesterolImpact: food.cholesterolImpact,
    }
    const reason = food.cholesterolReason?.trim()
    if (reason) row.cholesterolReason = reason
    addLabel(index, food.name, row)
  }
  return index
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

const seedIndex = indexSeed(seed)
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
 * A catalog food that carries LDL wins (Russian name, or that row's
 * English label). Otherwise the cholesterol seed — diary history for
 * names that are not on a catalog row. A key that collapses two different
 * names is ignored. Anything else is `unknown` with no reason.
 */
export function classifyFoodName(
  name: string | undefined,
): CholesterolClassification {
  if (!name || !cholesterolMatchKey(name)) return UNKNOWN
  const fromCatalog = lookup(catalogIndex, name)
  if (fromCatalog) return toClassification(fromCatalog)
  const fromSeed = lookup(seedIndex, name)
  if (fromSeed) return toClassification(fromSeed)
  return UNKNOWN
}

export function cholesterolSeed(): CholesterolSeedFile {
  return seed
}
