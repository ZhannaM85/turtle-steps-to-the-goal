import { describe, expect, it } from 'vitest'
import type { WaterEntry } from '@/domain/dailyEntry'
import { sortWaterEntriesByTime } from './sortWaterEntries'

function entry(id: string, timeDrunk?: string): WaterEntry {
  return { id, amountMl: 500, ...(timeDrunk ? { timeDrunk } : {}) }
}

describe('sortWaterEntriesByTime (#985)', () => {
  it('orders chips by clock time, earliest first', () => {
    const entries = [
      entry('a', '11:33'),
      entry('b', '08:02'),
      entry('c', '10:33'),
      entry('d', '09:22'),
      entry('e', '08:50'),
    ]

    expect(sortWaterEntriesByTime(entries).map((item) => item.id)).toEqual([
      'b',
      'e',
      'd',
      'c',
      'a',
    ])
  })

  it('keeps equal times in their previous order', () => {
    const entries = [entry('later', '09:00'), entry('earlier', '09:00')]

    expect(sortWaterEntriesByTime(entries).map((item) => item.id)).toEqual([
      'later',
      'earlier',
    ])
  })

  it('leaves entries with no readable time after timed ones', () => {
    const entries = [
      entry('none'),
      entry('late', '18:00'),
      entry('blank', '  '),
      entry('early', '07:05'),
    ]

    expect(sortWaterEntriesByTime(entries).map((item) => item.id)).toEqual([
      'early',
      'late',
      'none',
      'blank',
    ])
  })

  it('does not mutate the stored list', () => {
    const entries = [entry('late', '11:33'), entry('early', '10:33')]

    sortWaterEntriesByTime(entries)

    expect(entries.map((item) => item.id)).toEqual(['late', 'early'])
  })
})
