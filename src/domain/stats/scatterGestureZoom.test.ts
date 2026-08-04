import { describe, expect, it } from 'vitest'
import {
  clampScatterDomain,
  panScatterDomain,
  scatterDomainFromValues,
  zoomScatterDomainByScale,
  type ScatterZoomDomain,
} from './scatterGestureZoom'

const full: ScatterZoomDomain = {
  xMin: 0,
  xMax: 100,
  yMin: 0,
  yMax: 50,
}

describe('scatterGestureZoom', () => {
  it('scatterDomainFromValues pads extents', () => {
    const domain = scatterDomainFromValues([10, 20], [0, 10], 0.1)
    expect(domain).toEqual({
      xMin: 9,
      xMax: 21,
      yMin: -1,
      yMax: 11,
    })
  })

  it('clampScatterDomain returns null for the full window', () => {
    expect(clampScatterDomain(full, full)).toBeNull()
  })

  it('zoomScatterDomainByScale zooms in around the focus', () => {
    const next = zoomScatterDomainByScale(null, full, 2, 0.5, 0.5)
    expect(next).not.toBeNull()
    expect(next!.xMax - next!.xMin).toBeCloseTo(50)
    expect(next!.yMax - next!.yMin).toBeCloseTo(25)
    expect((next!.xMin + next!.xMax) / 2).toBeCloseTo(50)
  })

  it('panScatterDomain shifts within the full domain', () => {
    const zoomed = zoomScatterDomainByScale(null, full, 2, 0.5, 0.5)!
    const panned = panScatterDomain(zoomed, full, 0.2, 0)
    expect(panned).not.toBeNull()
    expect(panned!.xMin).toBeLessThan(zoomed.xMin)
  })

  it('refuses to shrink below the minimum fraction', () => {
    let domain: ScatterZoomDomain | null = full
    for (let i = 0; i < 20; i++) {
      domain = zoomScatterDomainByScale(domain, full, 2, 0.5, 0.5)
    }
    expect(domain).not.toBeNull()
    expect(domain!.xMax - domain!.xMin).toBeGreaterThanOrEqual(100 * 0.08 - 1e-9)
  })
})
