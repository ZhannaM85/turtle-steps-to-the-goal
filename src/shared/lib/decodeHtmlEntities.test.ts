import { describe, expect, it } from 'vitest'
import { decodeHtmlEntities } from './decodeHtmlEntities'

describe('decodeHtmlEntities', () => {
  it('leaves plain text unchanged', () => {
    expect(decodeHtmlEntities('Каша овсяная с джемом')).toBe(
      'Каша овсяная с джемом',
    )
  })

  it('decodes &quot; into a real quote (#641)', () => {
    expect(
      decodeHtmlEntities('Исландский скир &quot;Печеное яблоко&quot; 1,2%'),
    ).toBe('Исландский скир "Печеное яблоко" 1,2%')
  })

  it('decodes other common named and numeric entities', () => {
    expect(decodeHtmlEntities('Ben &amp; Jerry&#39;s')).toBe("Ben & Jerry's")
  })
})
