import { describe, expect, it } from 'vitest'
import { exportPeriodFileStamp } from './exportPeriodFileStamp'

const today = new Date(2026, 8, 7)

describe('exportPeriodFileStamp (#822)', () => {
  it('uses today when both bounds are blank', () => {
    expect(exportPeriodFileStamp('', '', today)).toBe('2026-09-07')
  })

  it('uses from-to when both bounds are set', () => {
    expect(exportPeriodFileStamp('2026-08-31', '2026-09-06', today)).toBe(
      '2026-08-31-to-2026-09-06',
    )
  })

  it('collapses a same-day range to one date', () => {
    expect(exportPeriodFileStamp('2026-09-07', '2026-09-07', today)).toBe(
      '2026-09-07',
    )
  })

  it('names an open-ended start bound', () => {
    expect(exportPeriodFileStamp('2026-08-01', '', today)).toBe(
      '2026-08-01-onward',
    )
  })

  it('names an open-ended end bound', () => {
    expect(exportPeriodFileStamp('', '2026-09-06', today)).toBe(
      'until-2026-09-06',
    )
  })
})
