import { describe, expect, it } from 'vitest'
import {
  applyDarkScreenshotOcrFilter,
  meanLuma,
  shouldInvertForOcr,
} from './prepareScreenshotForOcr'

describe('prepareScreenshotForOcr (#758)', () => {
  it('treats a dark pixel as needing invert', () => {
    const rgba = new Uint8ClampedArray([20, 20, 20, 255])
    expect(meanLuma(rgba)).toBeLessThan(110)
    expect(shouldInvertForOcr(rgba)).toBe(true)
  })

  it('leaves a light pixel as-is', () => {
    const rgba = new Uint8ClampedArray([240, 240, 240, 255])
    expect(shouldInvertForOcr(rgba)).toBe(false)
  })

  it('inverts a dark background so light text becomes black', () => {
    const rgba = new Uint8ClampedArray([30, 30, 30, 255, 250, 250, 250, 255])
    applyDarkScreenshotOcrFilter(rgba)
    expect([...rgba.slice(0, 3)]).toEqual([255, 255, 255])
    expect([...rgba.slice(4, 7)]).toEqual([0, 0, 0])
  })
})
