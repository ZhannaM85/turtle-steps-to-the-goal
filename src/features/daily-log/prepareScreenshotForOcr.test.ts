import { describe, expect, it } from 'vitest'
import {
  applyDarkScreenshotOcrFilter,
  meanLuma,
  ocrCanvasSize,
  ocrCanvasSizeAtLeast,
  OCR_MAX_EDGE,
  prepareAutoSleepScreenshotForOcr,
  prepareZeppScreenshotForOcr,
  shouldInvertForOcr,
} from './prepareScreenshotForOcr'

describe('prepareScreenshotForOcr (#758, #761, #771)', () => {
  it('treats a dark pixel as needing invert', () => {
    const rgba = new Uint8ClampedArray([20, 20, 20, 255])
    expect(meanLuma(rgba)).toBeLessThan(110)
    expect(shouldInvertForOcr(rgba)).toBe(true)
  })

  it('leaves a light pixel as-is', () => {
    const rgba = new Uint8ClampedArray([240, 240, 240, 255])
    expect(shouldInvertForOcr(rgba)).toBe(false)
  })

  it('inverts a dark background so light text becomes dark gray', () => {
    const rgba = new Uint8ClampedArray([30, 30, 30, 255, 250, 250, 250, 255])
    applyDarkScreenshotOcrFilter(rgba)
    expect([...rgba.slice(0, 3)]).toEqual([225, 225, 225])
    expect([...rgba.slice(4, 7)]).toEqual([5, 5, 5])
  })

  it('keeps a screenshot already within the OCR max edge', () => {
    expect(ocrCanvasSize(400, 800)).toEqual({ width: 400, height: 800 })
  })

  it('scales a phone screenshot so the long edge is OCR_MAX_EDGE', () => {
    expect(ocrCanvasSize(1170, 2532)).toEqual({
      width: Math.max(1, Math.round((1170 * OCR_MAX_EDGE) / 2532)),
      height: OCR_MAX_EDGE,
    })
  })

  it('upscales a small Zepp photo so the long edge is OCR_MAX_EDGE (#773)', () => {
    expect(ocrCanvasSizeAtLeast(471, 1024)).toEqual({
      width: Math.max(1, Math.round((471 * OCR_MAX_EDGE) / 1024)),
      height: OCR_MAX_EDGE,
    })
  })

  it('does not downscale a large Zepp screenshot (#773)', () => {
    expect(ocrCanvasSizeAtLeast(1170, 2532)).toEqual({
      width: 1170,
      height: 2532,
    })
  })

  it('returns the original blob when createImageBitmap is missing', async () => {
    const original = globalThis.createImageBitmap
    try {
      // @ts-expect-error — simulate environments without ImageBitmap
      delete globalThis.createImageBitmap
      const blob = new Blob(['x'], { type: 'image/png' })
      expect(await prepareAutoSleepScreenshotForOcr(blob)).toBe(blob)
    } finally {
      globalThis.createImageBitmap = original
    }
  })

  it('returns the original blob for Zepp when createImageBitmap is missing (#773)', async () => {
    const original = globalThis.createImageBitmap
    try {
      // @ts-expect-error — simulate environments without ImageBitmap
      delete globalThis.createImageBitmap
      const blob = new Blob(['x'], { type: 'image/png' })
      expect(await prepareZeppScreenshotForOcr(blob)).toBe(blob)
    } finally {
      globalThis.createImageBitmap = original
    }
  })
})
