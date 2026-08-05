import { describe, expect, it } from 'vitest'
import {
  buildZeppLifePatches,
  filterZeppBodyRowsByHeight,
  parseZeppActivityCsv,
  parseZeppBodyCsv,
  parseZeppUserCsv,
  summarizeZeppBodyProfiles,
  zeppTimeToLocalDate,
} from './zeppLifeParser'

const BOM = String.fromCharCode(0xfeff)

describe('parseZeppBodyCsv', () => {
  it('parses a well-formed BODY export, converting numeric columns', () => {
    const csv =
      `${BOM}time,weight,height,bmi,fatRate,bodyWaterRate,boneMass,metabolism,muscleRate,visceralFat\n` +
      '2026-01-15 06:09:29+0000,61.6,165.0,22.6,35.5,46.0,2.4,1173.0,37.29,6.0\n'

    const rows = parseZeppBodyCsv(csv)

    expect(rows).toEqual([
      {
        time: '2026-01-15 06:09:29+0000',
        weightKg: 61.6,
        heightCm: 165.0,
        fatRatePercent: 35.5,
        bodyWaterRatePercent: 46.0,
        boneMassKg: 2.4,
        muscleMassKg: 37.29,
        visceralFat: 6.0,
      },
    ])
  })

  it('treats literal "null" and empty cells as missing, not NaN', () => {
    const csv =
      'time,weight,height,bmi,fatRate,bodyWaterRate,boneMass,metabolism,muscleRate,visceralFat\n' +
      '2026-01-15 08:38:05+0000,60.2,165.0,22.1,null,null,null,null,null,null\n'

    const rows = parseZeppBodyCsv(csv)

    expect(rows).toEqual([
      {
        time: '2026-01-15 08:38:05+0000',
        weightKg: 60.2,
        heightCm: 165.0,
        fatRatePercent: undefined,
        bodyWaterRatePercent: undefined,
        boneMassKg: undefined,
        muscleMassKg: undefined,
        visceralFat: undefined,
      },
    ])
  })

  it('returns an empty array for a header-only (no data rows) export', () => {
    const csv =
      'time,weight,height,bmi,fatRate,bodyWaterRate,boneMass,metabolism,muscleRate,visceralFat\n'

    expect(parseZeppBodyCsv(csv)).toEqual([])
  })

  it('returns an empty array when required columns are missing', () => {
    expect(parseZeppBodyCsv('foo,bar\n1,2\n')).toEqual([])
  })
})

describe('parseZeppActivityCsv', () => {
  it('parses steps, ignoring distance/calories columns', () => {
    const csv =
      'date,steps,distance,runDistance,calories\n2026-01-15,8342,6200,0,320\n'

    expect(parseZeppActivityCsv(csv)).toEqual([
      { date: '2026-01-15', steps: 8342 },
    ])
  })

  it('skips rows whose date is not a plain YYYY-MM-DD string', () => {
    const csv =
      'date,steps,distance,runDistance,calories\n' +
      'not-a-date,8342,6200,0,320\n' +
      '2026-01-16,9000,6200,0,320\n'

    expect(parseZeppActivityCsv(csv)).toEqual([
      { date: '2026-01-16', steps: 9000 },
    ])
  })
})

describe('zeppTimeToLocalDate', () => {
  it('converts a UTC export timestamp to its local calendar date', () => {
    // Midday UTC so the local date matches across any realistic timezone.
    expect(zeppTimeToLocalDate('2026-01-15 12:00:00+0000')).toBe('2026-01-15')
  })
})

describe('buildZeppLifePatches', () => {
  it('keeps only the latest same-day BODY row (scale synced twice)', () => {
    const rows = [
      { time: '2026-01-15 06:00:00+0000', weightKg: 61.6 },
      { time: '2026-01-15 08:00:00+0000', weightKg: 61.4 },
    ]

    const patches = buildZeppLifePatches(rows, [])

    expect(patches.get('2026-01-15')).toEqual({ weightKg: 61.4 })
  })

  it('maps muscleRate directly to muscleMassKg (already kg, not a % — #458)', () => {
    const rows = [
      {
        time: '2026-01-15 12:00:00+0000',
        weightKg: 59.15,
        muscleMassKg: 37.63,
      },
    ]

    const patches = buildZeppLifePatches(rows, [])

    expect(patches.get('2026-01-15')).toEqual({
      weightKg: 59.15,
      // Same number Zepp Life shows as "Muscle 37.63 kg" — must NOT be
      // recomputed as weight * rate / 100 (that produced the old 22.26 bug).
      muscleMassKg: 37.63,
    })
  })

  it('merges ACTIVITY steps onto the same date as a BODY reading', () => {
    const patches = buildZeppLifePatches(
      [{ time: '2026-01-15 12:00:00+0000', weightKg: 60 }],
      [{ date: '2026-01-15', steps: 8000 }],
    )

    expect(patches.get('2026-01-15')).toEqual({ weightKg: 60, steps: 8000 })
  })

  it('adds a steps-only patch for a date with no BODY reading', () => {
    const patches = buildZeppLifePatches(
      [],
      [{ date: '2026-01-16', steps: 5000 }],
    )

    expect(patches.get('2026-01-16')).toEqual({ steps: 5000 })
  })
})

describe('summarizeZeppBodyProfiles / filterZeppBodyRowsByHeight (#616)', () => {
  it('groups BODY rows by height and attaches a matching USER nickName', () => {
    const rows = [
      { time: '2026-01-15 06:00:00+0000', weightKg: 60, heightCm: 160 },
      { time: '2026-01-15 08:00:00+0000', weightKg: 80, heightCm: 178 },
      { time: '2026-01-16 06:00:00+0000', weightKg: 59.5, heightCm: 160 },
    ]

    expect(
      summarizeZeppBodyProfiles(rows, {
        heightCm: 178,
        nickName: 'Alex',
      }),
    ).toEqual([
      {
        heightCm: 160,
        readingCount: 2,
        minWeightKg: 59.5,
        maxWeightKg: 60,
        nickName: undefined,
      },
      {
        heightCm: 178,
        readingCount: 1,
        minWeightKg: 80,
        maxWeightKg: 80,
        nickName: 'Alex',
      },
    ])
  })

  it('filters BODY rows to a single height', () => {
    const rows = [
      { time: '2026-01-15 06:00:00+0000', weightKg: 60, heightCm: 160 },
      { time: '2026-01-15 08:00:00+0000', weightKg: 80, heightCm: 178 },
    ]

    expect(filterZeppBodyRowsByHeight(rows, 160)).toEqual([rows[0]])
  })
})

describe('parseZeppUserCsv (#616)', () => {
  it('reads height and nickName from the first USER row', () => {
    const csv =
      'userId,gender,height,weight,nickName,avatar,birthday\n' +
      '1,1,178.0,83.45,Alex,https://example.com/a.jpg,1976-08\n'

    expect(parseZeppUserCsv(csv)).toEqual({
      heightCm: 178,
      nickName: 'Alex',
    })
  })
})
