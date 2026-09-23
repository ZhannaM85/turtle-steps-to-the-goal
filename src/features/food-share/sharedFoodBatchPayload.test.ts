import { describe, expect, it } from 'vitest'
import type { MealItem } from '@/domain/mealItem'
import {
  calorieItemsToShareMealItems,
  decodeSharedFoodLink,
  encodeSharedFoodBatchPayload,
  parseSharedFoodLinkFromText,
} from './sharedFoodBatchPayload'
import {
  decodeSharedFoodPayload,
  encodeSharedFoodPayload,
  type SharedFoodPayload,
} from './sharedFoodPayload'

const bread: SharedFoodPayload = {
  v: 1,
  name: 'Bread',
  amountKcal: 94,
  amountG: 36,
  proteinG: 3,
  fatG: 1,
  carbsG: 18,
}

const butter: SharedFoodPayload = {
  v: 1,
  name: 'Butter',
  amountKcal: 98,
  amountG: 13,
  fatG: 11,
}

function libraryItem(
  partial: Partial<MealItem> & Pick<MealItem, 'id' | 'name'>,
): MealItem {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('sharedFoodBatchPayload (#982)', () => {
  it('round-trips a batch without changing a single-food link', () => {
    const encoded = encodeSharedFoodBatchPayload([bread, butter])
    expect(encoded).not.toMatch(/[+/=]/)
    expect(decodeSharedFoodPayload(encoded)).toBeNull()
    expect(decodeSharedFoodLink(encoded)).toEqual({
      kind: 'many',
      items: [bread, butter],
    })

    const single = encodeSharedFoodPayload(bread)
    expect(decodeSharedFoodPayload(single)).toEqual(bread)
    expect(decodeSharedFoodLink(single)).toEqual({
      kind: 'one',
      payload: bread,
    })
  })

  it('reads a batch from the same shareFood URL shape', () => {
    const encoded = encodeSharedFoodBatchPayload([bread, butter])
    expect(
      parseSharedFoodLinkFromText(
        `https://example.com/app/?shareFood=${encoded}&x=1`,
      ),
    ).toEqual({ kind: 'many', items: [bread, butter] })
    expect(parseSharedFoodLinkFromText('not-valid')).toBeNull()
  })

  it('refuses a batch of one so a single dish stays v:1', () => {
    expect(() => encodeSharedFoodBatchPayload([bread])).toThrow()
  })

  it('shares named dishes in order and skips a blank name', () => {
    const shared = calorieItemsToShareMealItems(
      [
        { id: 'a', name: '  Bread ', amountKcal: 94, amountG: 36, proteinG: 3 },
        { id: 'b', amountKcal: 10 },
        { id: 'c', name: 'Butter', amountKcal: 98, fatG: 11 },
      ],
      [libraryItem({ id: 'lib', name: 'Bread', barcode: '111' })],
    )
    expect(shared.map((item) => item.name)).toEqual(['Bread', 'Butter'])
    expect(shared[0]).toMatchObject({
      id: 'lib',
      barcode: '111',
      lastAmountKcal: 94,
      lastAmountG: 36,
    })
    expect(shared[1]).toMatchObject({ id: 'c', lastAmountKcal: 98, lastFatG: 11 })
  })
})
