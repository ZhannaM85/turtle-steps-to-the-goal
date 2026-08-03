import { describe, expect, it } from 'vitest'
import { normalizeTextSpaces } from './normalizeTextSpaces'

describe('normalizeTextSpaces', () => {
  it('leaves ordinary spaces and text unchanged', () => {
    expect(normalizeTextSpaces('Каша овсяная с джемом')).toBe(
      'Каша овсяная с джемом',
    )
  })

  it('turns NBSP into ASCII space so wrapping can break between words (#559)', () => {
    const fromLevelKitchen =
      'Каша\u00A0овсяная\u00A0с\u00A0чиа\u00A0и\u00A0фруктовым\u00A0джемом (Level\u00A0Kitchen)'
    expect(normalizeTextSpaces(fromLevelKitchen)).toBe(
      'Каша овсяная с чиа и фруктовым джемом (Level Kitchen)',
    )
  })

  it('normalizes other Unicode space separators', () => {
    expect(normalizeTextSpaces('a\u202Fb\u2003c')).toBe('a b c')
  })
})
