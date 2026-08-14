import { describe, expect, it } from 'vitest'
import { searchFromIncomingShareUrl } from './searchFromIncomingShareUrl'

describe('searchFromIncomingShareUrl (#724)', () => {
  it('maps a Pages shareDay link onto the in-app query the confirm host watches', () => {
    expect(
      searchFromIncomingShareUrl(
        'https://zhannam85.github.io/turtle-steps-to-the-goal/?shareDay=abc%2Bdef',
      ),
    ).toBe('?shareDay=abc%2Bdef')
  })

  it('accepts the iOS custom scheme and Capacitor localhost URLs', () => {
    expect(
      searchFromIncomingShareUrl('turtlesteps://open?shareDay=payload1'),
    ).toBe('?shareDay=payload1')
    expect(
      searchFromIncomingShareUrl('capacitor://localhost/?shareDay=payload2'),
    ).toBe('?shareDay=payload2')
  })

  it('does not treat a food-share URL as a day snippet', () => {
    expect(
      searchFromIncomingShareUrl(
        'https://example.com/?shareFood=foodpayload',
      ),
    ).toBe('?shareFood=foodpayload')
  })

  it('ignores unrelated URLs', () => {
    expect(searchFromIncomingShareUrl('https://example.com/privacy')).toBeNull()
  })
})
