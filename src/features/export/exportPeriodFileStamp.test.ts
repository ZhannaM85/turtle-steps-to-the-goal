import { describe, expect, it } from 'vitest'
import {
  defaultDailyLogStem,
  exportPeriodFileStamp,
  exportPeriodForPreset,
  resolveExportFileStem,
} from './exportPeriodFileStamp'

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

describe('resolveExportFileStem (#821)', () => {
  it('falls back to the daily-log default when empty', () => {
    expect(resolveExportFileStem('  ', '2026-08-31', '2026-09-06', today)).toBe(
      defaultDailyLogStem('2026-08-31', '2026-09-06', today),
    )
  })

  it('keeps a custom stem and strips an extension', () => {
    expect(resolveExportFileStem('my-week.csv', '', '', today)).toBe('my-week')
  })
})

describe('exportPeriodForPreset (#819, #827)', () => {
  it('uses trailing week / month / year ending today', () => {
    expect(exportPeriodForPreset('week', today)).toEqual({
      start: '2026-09-01',
      end: '2026-09-07',
    })
    expect(exportPeriodForPreset('month', today)).toEqual({
      start: '2026-08-07',
      end: '2026-09-07',
    })
    expect(exportPeriodForPreset('year', today)).toEqual({
      start: '2025-09-07',
      end: '2026-09-07',
    })
  })

  it('leaves All blank until a first logged day is known (#830)', () => {
    expect(exportPeriodForPreset('all', today)).toEqual({ start: '', end: '' })
  })

  it('fills All from the first logged day through today (#830)', () => {
    expect(exportPeriodForPreset('all', today, '2026-03-01')).toEqual({
      start: '2026-03-01',
      end: '2026-09-07',
    })
  })
})
