import { describe, expect, it } from 'vitest'
import { en } from '@/i18n/en'
import {
  formatMacroGrams,
  macrosSummaryText,
  macrosSummaryTextCompact,
} from './macroDisplay'

describe('formatMacroGrams', () => {
  it('shows an em dash when the macro was not logged', () => {
    expect(formatMacroGrams(undefined, 'en', en)).toBe('—')
  })

  it('formats a logged value with the grams unit', () => {
    expect(formatMacroGrams(20, 'en', en)).toBe('20g')
  })
})

describe('macrosSummaryText', () => {
  it('returns null when none of the three macros were logged', () => {
    expect(
      macrosSummaryText(undefined, undefined, undefined, 'en', en),
    ).toBeNull()
  })

  it('shows dashes for the unlogged macros alongside the logged one', () => {
    expect(macrosSummaryText(undefined, 10, undefined, 'en', en)).toBe(
      'Protein — · Fat 10g · Carbs —',
    )
  })

  it('shows all three when fully logged', () => {
    expect(macrosSummaryText(20, 10, 30, 'en', en)).toBe(
      'Protein 20g · Fat 10g · Carbs 30g',
    )
  })
})

describe('macrosSummaryTextCompact', () => {
  it('returns null when none of the three macros were logged', () => {
    expect(
      macrosSummaryTextCompact(undefined, undefined, undefined, 'en', en),
    ).toBeNull()
  })

  it('uses single-initial labels instead of the full words (#67 History overflow fix)', () => {
    expect(macrosSummaryTextCompact(20, 10, 30, 'en', en)).toBe(
      'P 20g · F 10g · C 30g',
    )
  })
})
