import { describe, expect, it } from 'vitest'
import { resolveChartClickDate } from './chartNavigation'

interface Point {
  date: string
  weight?: number
}

const data: Point[] = [
  { date: '2026-03-01', weight: 80 },
  { date: '2026-03-02' }, // e.g. a rolling-average-only point, no real entry
]
const hasWeight = (point: Point) => point.weight !== undefined

describe('resolveChartClickDate', () => {
  it('returns the date when the clicked point has a real value for the target series', () => {
    const date = resolveChartClickDate(
      { activeLabel: '2026-03-01' },
      data,
      hasWeight,
    )
    expect(date).toBe('2026-03-01')
  })

  it('returns null when the click missed every point', () => {
    const date = resolveChartClickDate({}, data, hasWeight)
    expect(date).toBeNull()
  })

  it('returns null when the clicked date exists but has no value for the target series', () => {
    const date = resolveChartClickDate(
      { activeLabel: '2026-03-02' },
      data,
      hasWeight,
    )
    expect(date).toBeNull()
  })

  it('returns null when the clicked date is not in the data at all', () => {
    const date = resolveChartClickDate(
      { activeLabel: '2026-03-09' },
      data,
      hasWeight,
    )
    expect(date).toBeNull()
  })

  it('coerces a numeric activeLabel to a string before matching', () => {
    const numericData = [{ date: '42', weight: 1 }]
    const date = resolveChartClickDate(
      { activeLabel: 42 },
      numericData,
      hasWeight,
    )
    expect(date).toBe('42')
  })

  // This is the real shape Recharts 3.9.2 actually passes to onClick --
  // activeDataKey/activeIndex/activeCoordinate, but no activePayload array.
  // The original implementation silently depended on activePayload, which
  // is always undefined in production, so clicks never navigated (#45).
  it('resolves correctly from a realistic Recharts click state with no activePayload field', () => {
    const rechartsState = {
      activeTooltipIndex: 0,
      isTooltipActive: true,
      activeIndex: 0,
      activeLabel: '2026-03-01',
      activeDataKey: 'weight',
      activeCoordinate: { x: 10, y: 20 },
    }
    const date = resolveChartClickDate(rechartsState, data, hasWeight)
    expect(date).toBe('2026-03-01')
  })
})
