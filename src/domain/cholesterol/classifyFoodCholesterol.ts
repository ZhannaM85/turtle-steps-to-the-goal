import seedFile from '@/data/cholesterol-foods.json'
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

function indexFoods(file: CholesterolSeedFile): {
  byExact: Map<string, IndexedFood | 'ambiguous'>
  byKey: Map<string, IndexedFood | 'ambiguous'>
} {
  const byExact = new Map<string, IndexedFood | 'ambiguous'>()
  const byKey = new Map<string, IndexedFood | 'ambiguous'>()
  for (const food of file.foods) {
    if (!food.name || !isCholesterolImpact(food.cholesterolImpact)) continue
    const row: IndexedFood = {
      name: food.name,
      cholesterolImpact: food.cholesterolImpact,
    }
    const reason = food.cholesterolReason?.trim()
    if (reason) row.cholesterolReason = reason

    const exactPrev = byExact.get(food.name)
    byExact.set(food.name, exactPrev ? 'ambiguous' : row)

    const key = cholesterolMatchKey(food.name)
    const keyPrev = byKey.get(key)
    if (!keyPrev) byKey.set(key, row)
    else if (keyPrev === 'ambiguous' || keyPrev.name !== food.name) {
      byKey.set(key, 'ambiguous')
    }
  }
  return { byExact, byKey }
}

const index = indexFoods(seed)

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

/**
 * Exact seed `name` wins (the Russian label). `nameEn` and other metadata
 * are not match keys. Otherwise the conservative key above. A key that
 * collapses two different seed names is ignored (no guess). Anything else
 * is `unknown` with no reason.
 */
export function classifyFoodName(
  name: string | undefined,
): CholesterolClassification {
  if (!name || !cholesterolMatchKey(name)) return UNKNOWN
  const exact = index.byExact.get(name)
  if (exact && exact !== 'ambiguous') return toClassification(exact)
  const trimmed = name.trim()
  if (trimmed !== name) {
    const exactTrimmed = index.byExact.get(trimmed)
    if (exactTrimmed && exactTrimmed !== 'ambiguous') {
      return toClassification(exactTrimmed)
    }
  }
  const keyed = index.byKey.get(cholesterolMatchKey(name))
  if (keyed && keyed !== 'ambiguous') return toClassification(keyed)
  return UNKNOWN
}

export function cholesterolSeed(): CholesterolSeedFile {
  return seed
}
