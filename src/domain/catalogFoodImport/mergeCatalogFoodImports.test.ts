import { describe, expect, it } from 'vitest'
import { foods } from '@/data/foods'
import type { FoodItem } from '@/data/foods'
import type { CatalogFoodImport } from './CatalogFoodImport'
import {
  canonicalCatalogName,
  mergeCatalogFoodImports,
} from './mergeCatalogFoodImports'

function row(
  patch: Partial<CatalogFoodImport> & Pick<CatalogFoodImport, 'nameRu'>,
): CatalogFoodImport {
  return {
    kcal100: 95,
    protein100: 1.4,
    fat100: 7.5,
    carbs100: 6.3,
    cholesterolImpact: 'beneficial',
    cholesterolReason: 'Полезно для ЛПНП.',
    updatedAt: '2026-09-26T00:00:00.000Z',
    ...patch,
  }
}

const sample: FoodItem[] = [
  {
    id: 'oats',
    en: 'Oatmeal',
    ru: 'Овсянка',
    kcal100: 71,
    protein100: 2.5,
    fat100: 1.5,
    carbs100: 12,
    cholesterolImpact: 'beneficial',
    cholesterolReason: 'Старая причина.',
  },
  {
    id: 'chicken-breast',
    en: 'Chicken breast',
    ru: 'Куриная грудка',
    kcal100: 165,
    protein100: 31,
    fat100: 3.6,
    carbs100: 0,
  },
]

describe('mergeCatalogFoodImports (#1015)', () => {
  it('returns the same list when nothing was pasted', () => {
    expect(mergeCatalogFoodImports(foods, [])).toBe(foods)
  })

  it('updates an exact Russian name in place and leaves the other row', () => {
    const next = mergeCatalogFoodImports(sample, [
      row({ nameRu: 'Овсянка', kcal100: 80, cholesterolImpact: 'neutral' }),
    ])
    expect(next).toHaveLength(sample.length)
    expect(next[0]).toMatchObject({
      id: 'oats',
      en: 'Oatmeal',
      ru: 'Овсянка',
      kcal100: 80,
      protein100: 1.4,
      cholesterolImpact: 'neutral',
      cholesterolReason: 'Полезно для ЛПНП.',
    })
    expect(next[1]).toBe(sample[1])
  })

  it('matches a different letter case to the catalog name', () => {
    expect(canonicalCatalogName('овсянка', sample)).toBe('Овсянка')
    const next = mergeCatalogFoodImports(sample, [row({ nameRu: 'овсянка' })])
    expect(next.filter((food) => food.ru === 'Овсянка')).toHaveLength(1)
    expect(next).toHaveLength(sample.length)
    expect(next.some((food) => food.ru === 'овсянка')).toBe(false)
  })

  it('appends a new name once', () => {
    const pasted = row({
      nameRu: 'Салат Коул слоу',
      nameEn: 'Coleslaw',
    })
    const once = mergeCatalogFoodImports(sample, [pasted])
    const twice = mergeCatalogFoodImports(once, [pasted])
    expect(once).toHaveLength(sample.length + 1)
    expect(twice).toHaveLength(sample.length + 1)
    expect(twice.filter((food) => food.ru === 'Салат Коул слоу')).toEqual([
      expect.objectContaining({
        id: `user-catalog-${encodeURIComponent('Салат Коул слоу')}`,
        en: 'Coleslaw',
        kcal100: 95,
        cholesterolImpact: 'beneficial',
      }),
    ])
  })

  it('clears a reason the paste does not include', () => {
    const next = mergeCatalogFoodImports(sample, [
      row({
        nameRu: 'Овсянка',
        cholesterolImpact: 'unknown',
        cholesterolReason: undefined,
      }),
    ])
    expect(next[0]?.cholesterolImpact).toBe('unknown')
    expect(next[0]?.cholesterolReason).toBeUndefined()
  })
})
