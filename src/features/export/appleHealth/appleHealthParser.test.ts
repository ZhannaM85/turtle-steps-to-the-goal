import { describe, expect, it } from 'vitest'
import {
  AppleHealthPatchBuilder,
  AppleHealthRecordScanner,
} from './appleHealthParser'

describe('AppleHealthRecordScanner', () => {
  it('extracts a single well-formed Record from one chunk', () => {
    const scanner = new AppleHealthRecordScanner()
    const records = scanner.push(
      '<Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" value="60.5" ' +
        'startDate="2026-01-15 12:00:00+0000" endDate="2026-01-15 12:00:00+0000"/>',
    )

    expect(records).toEqual([
      {
        type: 'HKQuantityTypeIdentifierBodyMass',
        unit: 'kg',
        value: '60.5',
        creationDate: undefined,
        startDate: '2026-01-15 12:00:00+0000',
        endDate: '2026-01-15 12:00:00+0000',
      },
    ])
  })

  it('completes a Record tag split across two chunks, without losing it or the next one', () => {
    const scanner = new AppleHealthRecordScanner()
    const first = scanner.push(
      '<Record type="HKQuantityTypeIdentifierStepCount" unit="count" val',
    )
    expect(first).toEqual([])

    const second = scanner.push(
      'ue="10" startDate="2026-01-15 08:00:00+0000"/>' +
        '<Record type="HKQuantityTypeIdentifierStepCount" unit="count" value="5" ' +
        'startDate="2026-01-15 09:00:00+0000"/>',
    )
    expect(second).toHaveLength(2)
    expect(second[0]).toMatchObject({ value: '10' })
    expect(second[1]).toMatchObject({ value: '5' })
  })

  it('ignores non-Record markup (Correlation/Workout/comments) between records', () => {
    const scanner = new AppleHealthRecordScanner()
    const records = scanner.push(
      '<!-- some comment --><Correlation type="HKCorrelationTypeIdentifierBloodPressure">' +
        '<Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" value="60"/>' +
        '</Correlation>',
    )

    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      type: 'HKQuantityTypeIdentifierBodyMass',
    })
  })

  it('stays fast through a long stretch with no Record tags at all (real export.xml has these inside Workout blocks)', () => {
    const scanner = new AppleHealthRecordScanner()
    // A ~5MB no-match stretch, fed in small chunks like a real decompressor
    // would — reproduces the shape of a real Workout block. Before the
    // scanFrom fix, this rescanned the whole accumulated buffer from byte
    // 0 on every push(), an O(n²) blowup confirmed directly against a real
    // 1.3GB export (a couple of seconds fixed vs. minutes-and-climbing
    // broken).
    const noMatchChunk =
      '<WorkoutEvent type="Pause" date="2026-01-15 08:00:00 +0000"/>'
    const chunkCount = 50_000 // ~50000 * ~60 bytes ≈ 3MB
    const start = performance.now()
    for (let i = 0; i < chunkCount; i++) {
      scanner.push(noMatchChunk)
    }
    const records = scanner.push(
      '<Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" value="60"/>',
    )
    const elapsedMs = performance.now() - start

    expect(records).toHaveLength(1)
    // Generous bound (linear-time work over ~3MB should take low tens of
    // ms at most) — this would be many seconds to minutes if the O(n²)
    // rescan regressed.
    expect(elapsedMs).toBeLessThan(2000)
  })

  it('unescapes XML entities in attribute values', () => {
    const scanner = new AppleHealthRecordScanner()
    const records = scanner.push(
      '<Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" value="60" ' +
        'device="&lt;&lt;HKDevice: name&gt;&gt;"/>',
    )

    expect(records[0].type).toBe('HKQuantityTypeIdentifierBodyMass')
  })
})

describe('AppleHealthPatchBuilder', () => {
  it('maps BodyMass directly to weightKg', () => {
    const builder = new AppleHealthPatchBuilder()
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierBodyMass',
      unit: 'kg',
      value: '61.4',
      startDate: '2026-01-15 12:00:00+0000',
    })

    expect(builder.build().get('2026-01-15')).toEqual({ weightKg: 61.4 })
  })

  it('converts BodyFatPercentage from a 0-1 fraction to a 0-100 percent', () => {
    const builder = new AppleHealthPatchBuilder()
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierBodyFatPercentage',
      unit: '%',
      value: '0.274',
      startDate: '2026-01-15 12:00:00+0000',
    })

    expect(builder.build().get('2026-01-15')).toEqual({ bodyFatPercent: 27.4 })
  })

  it('only accepts WaistCircumference when its own unit is cm', () => {
    const builder = new AppleHealthPatchBuilder()
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierWaistCircumference',
      unit: 'in',
      value: '30',
      startDate: '2026-01-15 12:00:00+0000',
    })
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierWaistCircumference',
      unit: 'cm',
      value: '76',
      startDate: '2026-01-16 12:00:00+0000',
    })

    const patches = builder.build()
    expect(patches.get('2026-01-15')).toBeUndefined()
    expect(patches.get('2026-01-16')).toEqual({ waistCm: 76 })
  })

  it('sums StepCount across multiple intraday records on the same date', () => {
    const builder = new AppleHealthPatchBuilder()
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierStepCount',
      value: '10',
      startDate: '2026-01-15 08:00:00+0000',
    })
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierStepCount',
      value: '25',
      startDate: '2026-01-15 12:00:00+0000',
    })

    expect(builder.build().get('2026-01-15')).toEqual({ steps: 35 })
  })

  it('turns each DietaryWater record into its own WaterEntry', () => {
    const builder = new AppleHealthPatchBuilder()
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierDietaryWater',
      unit: 'mL',
      value: '250',
      startDate: '2026-01-15 08:00:00+0000',
    })
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierDietaryWater',
      unit: 'mL',
      value: '300',
      startDate: '2026-01-15 12:00:00+0000',
    })

    const patch = builder.build().get('2026-01-15')
    expect(patch?.waterEntries).toHaveLength(2)
    expect(patch?.waterEntries?.map((e) => e.amountMl)).toEqual([250, 300])
  })

  it('keeps only the latest same-day BodyMass reading, not the first-seen one', () => {
    const builder = new AppleHealthPatchBuilder()
    // 30 minutes apart, both safely mid-day UTC — no real-world timezone
    // offset splits these two onto different local calendar dates (that
    // would need an offset landing in an ~11:30-12:00 sliver nothing uses),
    // unlike parseHealthTimestamp.test.ts's own cross-offset epochMs case.
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierBodyMass',
      unit: 'kg',
      value: '61.0',
      startDate: '2026-01-15 12:00:00+0000',
    })
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierBodyMass',
      unit: 'kg',
      value: '60.5',
      startDate: '2026-01-15 12:30:00+0000',
    })

    const patches = builder.build()
    expect(patches.size).toBe(1)
    const [patch] = patches.values()
    expect(patch.weightKg).toBe(60.5)
  })

  it('ignores record types with no matching DailyEntry field', () => {
    const builder = new AppleHealthPatchBuilder()
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierBodyMassIndex',
      unit: 'count',
      value: '22.5',
      startDate: '2026-01-15 12:00:00+0000',
    })
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierHeartRate',
      unit: 'count/min',
      value: '70',
      startDate: '2026-01-15 12:00:00+0000',
    })

    expect(builder.build().size).toBe(0)
  })
})
