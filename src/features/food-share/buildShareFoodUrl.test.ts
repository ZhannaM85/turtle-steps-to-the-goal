import { describe, expect, it } from 'vitest'
import { buildShareFoodBatchUrl, buildShareFoodUrl } from './buildShareFoodUrl'
import { decodeSharedFoodLink } from './sharedFoodBatchPayload'
import {
  decodeSharedFoodPayload,
  SHARE_FOOD_QUERY_PARAM,
} from './sharedFoodPayload'

describe('buildShareFoodUrl (#661)', () => {
  it('puts the encoded payload on shareFood under the app base path', () => {
    const url = buildShareFoodUrl(
      { v: 1, name: 'Soup' },
      {
        origin: 'https://example.com',
        baseUrl: '/turtle-steps-to-the-goal/',
      },
    )
    const parsed = new URL(url)
    expect(parsed.origin).toBe('https://example.com')
    expect(parsed.pathname).toBe('/turtle-steps-to-the-goal/')
    const encoded = parsed.searchParams.get(SHARE_FOOD_QUERY_PARAM)
    expect(encoded).toBeTruthy()
    expect(decodeSharedFoodPayload(encoded!)).toEqual({
      v: 1,
      name: 'Soup',
    })
  })

  it('puts a multi-food batch on the same shareFood param (#982)', () => {
    const url = buildShareFoodBatchUrl(
      [
        { v: 1, name: 'Bread', amountKcal: 94 },
        { v: 1, name: 'Butter', amountKcal: 98 },
      ],
      {
        origin: 'https://example.com',
        baseUrl: '/turtle-steps-to-the-goal/',
      },
    )
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/turtle-steps-to-the-goal/')
    const encoded = parsed.searchParams.get(SHARE_FOOD_QUERY_PARAM)
    expect(decodeSharedFoodLink(encoded!)).toEqual({
      kind: 'many',
      items: [
        { v: 1, name: 'Bread', amountKcal: 94 },
        { v: 1, name: 'Butter', amountKcal: 98 },
      ],
    })
  })
})
