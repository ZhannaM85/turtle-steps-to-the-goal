import { describe, expect, it } from 'vitest'
import { flagOutliers, isOutlier, outlierBounds } from './outlierDetection'

describe('outlierBounds', () => {
  it('returns null with fewer than 4 values', () => {
    expect(outlierBounds([1, 2, 3])).toBeNull()
  })

  it('computes 1.5x-IQR fences for a simple dataset', () => {
    // Sorted: 1, 2, 3, 4, 5, 6, 7, 8, 9 — Q1 = 3, Q3 = 7, IQR = 4.
    const bounds = outlierBounds([9, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(bounds).not.toBeNull()
    expect(bounds!.lower).toBe(-3)
    expect(bounds!.upper).toBe(13)
  })
})

describe('isOutlier', () => {
  it('flags a value outside the bounds', () => {
    expect(isOutlier(100, { lower: -3, upper: 13 })).toBe(true)
    expect(isOutlier(-50, { lower: -3, upper: 13 })).toBe(true)
  })

  it('does not flag a value within the bounds', () => {
    expect(isOutlier(5, { lower: -3, upper: 13 })).toBe(false)
  })

  it('never flags anything when bounds are null (too few values)', () => {
    expect(isOutlier(1000, null)).toBe(false)
  })
})

describe('flagOutliers', () => {
  it('flags a point whose X value is an outlier', () => {
    const points = [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
      { x: 5, y: 0 },
      { x: 100, y: 0 },
    ]

    const flags = flagOutliers(
      points,
      (p) => p.x,
      (p) => p.y,
    )
    expect(flags).toEqual([false, false, false, false, false, true])
  })

  it('flags a point whose Y value is an outlier, even with an unremarkable X', () => {
    const points = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
      { x: 6, y: 1000 },
    ]

    const flags = flagOutliers(
      points,
      (p) => p.x,
      (p) => p.y,
    )
    expect(flags).toEqual([false, false, false, false, false, true])
  })

  it('flags nothing when every point is unremarkable', () => {
    const points = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
    ]

    const flags = flagOutliers(
      points,
      (p) => p.x,
      (p) => p.y,
    )
    expect(flags).toEqual([false, false, false, false])
  })
})
