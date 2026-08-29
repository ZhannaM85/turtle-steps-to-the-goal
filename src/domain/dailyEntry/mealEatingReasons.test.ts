import { describe, expect, it } from 'vitest'
import {
  applyEatingReasons,
  mealEatingReasons,
  orderEatingReasons,
} from './mealEatingReasons'

describe('mealEatingReasons (#774)', () => {
  it('returns the legacy single reason when the list is absent', () => {
    expect(mealEatingReasons({ eatingReason: 'hunger' })).toEqual(['hunger'])
  })

  it('prefers the list when both are set', () => {
    expect(
      mealEatingReasons({
        eatingReason: 'hunger',
        eatingReasons: ['lonely', 'hunger'],
      }),
    ).toEqual(['hunger', 'lonely'])
  })

  it('returns empty when neither is set', () => {
    expect(mealEatingReasons({})).toEqual([])
  })
})

describe('applyEatingReasons (#774)', () => {
  it('stores a single pick on eatingReason only', () => {
    expect(applyEatingReasons({}, ['hunger'])).toEqual({
      eatingReason: 'hunger',
      eatingReasons: undefined,
    })
  })

  it('stores several picks on both fields, eatingReason as the first', () => {
    expect(applyEatingReasons({}, ['lonely', 'hunger'])).toEqual({
      eatingReason: 'hunger',
      eatingReasons: ['hunger', 'lonely'],
    })
  })

  it('clears both fields when empty', () => {
    expect(
      applyEatingReasons(
        { eatingReason: 'hunger', eatingReasons: ['hunger', 'lonely'] },
        [],
      ),
    ).toEqual({ eatingReason: undefined, eatingReasons: undefined })
  })
})

describe('orderEatingReasons (#774)', () => {
  it('puts built-ins in HALT-then-habit order before customs', () => {
    expect(
      orderEatingReasons(['Tired after work', 'lonely', 'hunger']),
    ).toEqual(['hunger', 'lonely', 'Tired after work'])
  })
})
