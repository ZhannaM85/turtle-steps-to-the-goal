import { describe, expect, it } from 'vitest'
import { parseHealthTimestamp } from './parseHealthTimestamp'

describe('parseHealthTimestamp', () => {
  it('converts a UTC (+0000) timestamp to its local calendar date', () => {
    // Midday UTC so the local date matches across any realistic timezone.
    expect(parseHealthTimestamp('2026-01-15 12:00:00+0000').localDate).toBe(
      '2026-01-15',
    )
  })

  it('converts a non-UTC-offset timestamp (no space before the offset) too', () => {
    expect(parseHealthTimestamp('2026-01-15 12:00:00+0300').localDate).toBe(
      '2026-01-15',
    )
  })

  it("handles a space before the offset (Apple Health's actual format, confirmed from a real export)", () => {
    expect(parseHealthTimestamp('2026-01-15 12:00:00 +0300').localDate).toBe(
      '2026-01-15',
    )
  })

  it('orders two instants with different offsets by real chronology, not string order', () => {
    // "2026-01-01 20:00:00-0900" is 2026-01-02 05:00:00 UTC (local minus a
    // negative offset adds hours). "2026-01-02 00:30:00+0000" is already
    // UTC: 2026-01-02 00:30:00. The string-earlier timestamp (day 1) is
    // therefore the chronologically *later* instant (05:00 > 00:30 UTC) —
    // exactly the case plain string comparison gets wrong.
    const earlierByString = parseHealthTimestamp('2026-01-01 20:00:00-0900')
    const laterByString = parseHealthTimestamp('2026-01-02 00:30:00+0000')

    expect(earlierByString.epochMs).toBeGreaterThan(laterByString.epochMs)
  })
})
