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

  it('updates by barcode before the Russian name (#1027)', () => {
    const first = mergeCatalogFoodImports(sample, [
      row({
        nameRu: 'Молоко без лактозы 1,5%',
        nameEn: 'Lactose-free milk 1.5%',
        barcode: '4600605026533',
        brand: 'Простоквашино',
        kcal100: 45,
      }),
    ])
    const renamed = mergeCatalogFoodImports(first, [
      row({
        nameRu: 'Молоко 1,5% без лактозы',
        barcode: '4600 6050 26533',
        brand: 'Простоквашино',
        kcal100: 47,
      }),
    ])
    const packaged = renamed.filter((food) => food.barcode === '4600605026533')
    expect(packaged).toHaveLength(1)
    expect(packaged[0]).toMatchObject({
      id: 'user-catalog-bc-4600605026533',
      ru: 'Молоко 1,5% без лактозы',
      en: 'Lactose-free milk 1.5%',
      brand: 'Простоквашино',
      kcal100: 47,
    })
    expect(renamed).toHaveLength(sample.length + 1)
    expect(renamed.filter((food) => food.ru === 'Овсянка')).toHaveLength(1)
  })

  it('keeps a name-only import on its own row when barcode is omitted', () => {
    const next = mergeCatalogFoodImports(sample, [
      row({ nameRu: 'Салат Коул слоу' }),
      row({ nameRu: 'Творог', kcal100: 98 }),
    ])
    expect(next.filter((food) => food.ru === 'Салат Коул слоу')).toHaveLength(1)
    expect(next.filter((food) => food.ru === 'Творог')).toHaveLength(1)
    expect(next.find((food) => food.ru === 'Творог')?.barcode).toBeUndefined()
  })

  it('does not retitle a curated food when a later paste reuses its barcode', () => {
    const tagged = mergeCatalogFoodImports(sample, [
      row({ nameRu: 'Овсянка', barcode: '111', kcal100: 80 }),
    ])
    const next = mergeCatalogFoodImports(tagged, [
      row({ nameRu: 'Другая овсянка', barcode: '111', kcal100: 90 }),
    ])
    expect(next).toHaveLength(sample.length)
    expect(next[0]).toMatchObject({
      id: 'oats',
      ru: 'Овсянка',
      en: 'Oatmeal',
      barcode: '111',
      kcal100: 90,
    })
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
