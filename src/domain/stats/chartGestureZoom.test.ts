import { describe, expect, it } from 'vitest'
import {
  CHART_ZOOM_MIN_SPAN,
  clampZoomWindow,
  panZoomWindow,
  sliceByZoomWindow,
  zoomWindowByScale,
} from './chartGestureZoom'

describe('chartGestureZoom (#543)', () => {
  it('returns null when the full range fits in min span', () => {
    expect(
      clampZoomWindow({ startIndex: 0, endIndex: 3 }, 5, 7),
    ).toBeNull()
  })

  it('clamps and expands short windows to min span', () => {
    expect(
      clampZoomWindow({ startIndex: 10, endIndex: 11 }, 40, 7),
    ).toEqual({ startIndex: 10, endIndex: 16 })
  })

  it('zooms in around the focus ratio', () => {
    const next = zoomWindowByScale(
      { startIndex: 0, endIndex: 99 },
      100,
      2,
      0.5,
      7,
    )
    expect(next).not.toBeNull()
    expect(next!.endIndex - next!.startIndex + 1).toBe(50)
    expect(next!.startIndex).toBeGreaterThanOrEqual(20)
    expect(next!.endIndex).toBeLessThanOrEqual(79)
  })

  it('pans without changing span', () => {
    const next = panZoomWindow({ startIndex: 10, endIndex: 19 }, 50, 5, 7)
    expect(next).toEqual({ startIndex: 15, endIndex: 24 })
  })

  it('sliceByZoomWindow returns the full list when not zoomed', () => {
    expect(sliceByZoomWindow(['a', 'b', 'c'], null)).toEqual(['a', 'b', 'c'])
  })

  it('sliceByZoomWindow slices inclusive indices', () => {
    expect(
      sliceByZoomWindow(
        ['a', 'b', 'c', 'd'],
        { startIndex: 1, endIndex: 2 },
      ),
    ).toEqual(['b', 'c'])
  })

  it('exposes the default min span used by Compare Data', () => {
    expect(CHART_ZOOM_MIN_SPAN).toBe(7)
  })
})
