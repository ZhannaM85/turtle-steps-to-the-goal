import { describe, expect, it } from 'vitest'
import { resolveChartClickDate } from './chartNavigation'

describe('resolveChartClickDate', () => {
  it('returns the date when the clicked series has a real value there', () => {
    const date = resolveChartClickDate(
      {
        activeLabel: '2026-03-01',
        activePayload: [{ dataKey: 'weight', value: 80 }],
      },
      'weight',
    )
    expect(date).toBe('2026-03-01')
  })

  it('returns null when the click missed every point', () => {
    const date = resolveChartClickDate({}, 'weight')
    expect(date).toBeNull()
  })

  it('returns null when only a different series (e.g. the projection line) has a value there', () => {
    const date = resolveChartClickDate(
      {
        activeLabel: '2026-03-05',
        activePayload: [{ dataKey: 'projection', value: 79 }],
      },
      'weight',
    )
    expect(date).toBeNull()
  })

  it('returns null when the target series value is null at that point', () => {
    const date = resolveChartClickDate(
      {
        activeLabel: '2026-03-05',
        activePayload: [{ dataKey: 'weight', value: null }],
      },
      'weight',
    )
    expect(date).toBeNull()
  })

  it('coerces a numeric activeLabel to a string', () => {
    const date = resolveChartClickDate(
      {
        activeLabel: 42,
        activePayload: [{ dataKey: 'calories', value: 2000 }],
      },
      'calories',
    )
    expect(date).toBe('42')
  })
})
