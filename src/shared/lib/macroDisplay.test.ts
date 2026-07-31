import { describe, expect, it } from 'vitest'
import { en } from '@/i18n/en'
import {
  formatMacroGrams,
  macrosSummaryText,
  macrosSummaryTextCompact,
  macrosSummaryTextCompactWithCalories,
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

describe('macrosSummaryTextCompactWithCalories (#473)', () => {
  it('returns a bare kcal figure when no macros were logged', () => {
    expect(
      macrosSummaryTextCompactWithCalories(
        175,
        undefined,
        undefined,
        undefined,
        'en',
        en,
      ),
    ).toBe('175 kcal')
  })

  it('leads with kcal and uses single-initial macro labels', () => {
    expect(
      macrosSummaryTextCompactWithCalories(2430, 76, 176, 138, 'en', en),
    ).toBe('2,430 kcal · P 76g · F 176g · C 138g')
  })
})
