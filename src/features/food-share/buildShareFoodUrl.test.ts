import { describe, expect, it } from 'vitest'
import { buildShareFoodUrl } from './buildShareFoodUrl'
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
})
