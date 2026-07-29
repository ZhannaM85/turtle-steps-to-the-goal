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

  it('extracts sourceName (#385)', () => {
    const scanner = new AppleHealthRecordScanner()
    const records = scanner.push(
      '<Record type="HKQuantityTypeIdentifierStepCount" unit="count" value="120" ' +
        'sourceName="My Watch" startDate="2026-01-15 08:00:00+0000"/>',
    )

    expect(records[0].sourceName).toBe('My Watch')
  })

  describe('a paired (non-self-closing) Record with MetadataEntry children (#411)', () => {
    it('still extracts the Record\'s own attributes, ignoring the metadata', () => {
      const scanner = new AppleHealthRecordScanner()
      const records = scanner.push(
        '<Record type="HKCategoryTypeIdentifierMenstrualFlow" sourceName="Health" ' +
          'startDate="2026-07-11 08:00:00+0000" endDate="2026-07-11 08:00:00+0000" ' +
          'value="HKCategoryValueMenstrualFlowMedium">' +
          '<MetadataEntry key="HKMetadataKeyMenstrualCycleStart" value="1"/>' +
          '</Record>',
      )

      expect(records).toEqual([
        {
          type: 'HKCategoryTypeIdentifierMenstrualFlow',
          unit: undefined,
          value: 'HKCategoryValueMenstrualFlowMedium',
          creationDate: undefined,
          startDate: '2026-07-11 08:00:00+0000',
          endDate: '2026-07-11 08:00:00+0000',
          sourceName: 'Health',
        },
      ])
    })

    it('handles multiple MetadataEntry children on one record', () => {
      const scanner = new AppleHealthRecordScanner()
      const records = scanner.push(
        '<Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" value="60.5" ' +
          'startDate="2026-01-15 12:00:00+0000">' +
          '<MetadataEntry key="HKWasUserEntered" value="1"/>' +
          '<MetadataEntry key="HKMetadataKeyDeviceManufacturerName" value="Acme"/>' +
          '</Record>',
      )

      expect(records).toHaveLength(1)
      expect(records[0]).toMatchObject({ type: 'HKQuantityTypeIdentifierBodyMass' })
    })

    it('does not run away past this record into a later, unrelated Record (no false nesting)', () => {
      const scanner = new AppleHealthRecordScanner()
      const records = scanner.push(
        '<Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" value="60.5" ' +
          'startDate="2026-01-15 12:00:00+0000">' +
          '<MetadataEntry key="HKWasUserEntered" value="1"/>' +
          '</Record>' +
          '<Record type="HKQuantityTypeIdentifierStepCount" unit="count" value="500"/>',
      )

      expect(records).toHaveLength(2)
      expect(records[0].type).toBe('HKQuantityTypeIdentifierBodyMass')
      expect(records[1].type).toBe('HKQuantityTypeIdentifierStepCount')
    })

    it('completes a paired Record split across two chunks', () => {
      const scanner = new AppleHealthRecordScanner()
      const first = scanner.push(
        '<Record type="HKCategoryTypeIdentifierMenstrualFlow" ' +
          'startDate="2026-07-11 08:00:00+0000" value="HKCategoryValueMenstrualFlowLight">' +
          '<MetadataEntry key="HKMetadataKeyMenst',
      )
      const second = scanner.push('rualCycleStart" value="1"/></Record>')

      expect(first).toHaveLength(0)
      expect(second).toHaveLength(1)
      expect(second[0].type).toBe('HKCategoryTypeIdentifierMenstrualFlow')
    })
  })

  it('stays fast through a long stretch of paired Records with metadata (no catastrophic backtracking)', () => {
    const scanner = new AppleHealthRecordScanner()
    // 2,000 realistic paired records with a metadata child each -- confirms
    // the #411 regex's lazy [\s\S]*? alternative doesn't reintroduce the
    // same class of O(n^2) blowup the self-closing-only version was
    // already fixed against (see the no-match-stretch test above).
    const chunk =
      '<Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" value="60.5" ' +
      'startDate="2026-01-15 12:00:00+0000"><MetadataEntry key="HKWasUserEntered" value="1"/></Record>'
    const start = performance.now()
    let total = 0
    for (let i = 0; i < 2000; i++) {
      total += scanner.push(chunk).length
    }
    const elapsedMs = performance.now() - start

    expect(total).toBe(2000)
    expect(elapsedMs).toBeLessThan(2000)
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

  it('sums StepCount across multiple intraday records from the same source on the same date', () => {
    const builder = new AppleHealthPatchBuilder()
    // Neither record has its own sourceName — both fall into the same
    // "unknown source" bucket (#385), so they still sum together like any
    // other same-source pair would.
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

  it('keeps only the dominant source\'s steps for a date, not the sum across sources (#385)', () => {
    const builder = new AppleHealthPatchBuilder()
    // iPhone: 3000 + 1000 = 4000. Watch: 4500. Naively summing every
    // record regardless of source would give 8500 — double-counting the
    // same real walk logged by both devices.
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierStepCount',
      value: '3000',
      startDate: '2026-01-15 08:00:00+0000',
      sourceName: 'iPhone',
    })
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierStepCount',
      value: '4500',
      startDate: '2026-01-15 09:00:00+0000',
      sourceName: 'My Watch',
    })
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierStepCount',
      value: '1000',
      startDate: '2026-01-15 17:00:00+0000',
      sourceName: 'iPhone',
    })

    expect(builder.build().get('2026-01-15')).toEqual({ steps: 4500 })
  })

  it('resolves the dominant source independently per date', () => {
    const builder = new AppleHealthPatchBuilder()
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierStepCount',
      value: '6000',
      startDate: '2026-01-15 08:00:00+0000',
      sourceName: 'iPhone',
    })
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierStepCount',
      value: '2000',
      startDate: '2026-01-15 09:00:00+0000',
      sourceName: 'My Watch',
    })
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierStepCount',
      value: '1500',
      startDate: '2026-01-16 08:00:00+0000',
      sourceName: 'iPhone',
    })
    builder.addRecord({
      type: 'HKQuantityTypeIdentifierStepCount',
      value: '7000',
      startDate: '2026-01-16 09:00:00+0000',
      sourceName: 'My Watch',
    })

    const patches = builder.build()
    expect(patches.get('2026-01-15')).toEqual({ steps: 6000 })
    expect(patches.get('2026-01-16')).toEqual({ steps: 7000 })
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

  describe('sleep (#368)', () => {
    it('sums Asleep-stage interval durations into sleepHours, bucketed by the wake date', () => {
      const builder = new AppleHealthPatchBuilder()
      // Falls asleep 23:00 on the 14th, wakes 07:00 on the 15th — belongs
      // to the 15th (the day this sleep is reviewed "this morning"), not
      // the 14th (the day the interval started).
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierSleepAnalysis',
        value: 'HKCategoryValueSleepAnalysisAsleepCore',
        startDate: '2026-01-14 23:00:00+0000',
        endDate: '2026-01-15 03:00:00+0000',
      })
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierSleepAnalysis',
        value: 'HKCategoryValueSleepAnalysisAsleepREM',
        startDate: '2026-01-15 03:00:00+0000',
        endDate: '2026-01-15 07:00:00+0000',
      })

      const patches = builder.build()
      expect(patches.get('2026-01-14')).toBeUndefined()
      expect(patches.get('2026-01-15')).toEqual({ sleepHours: 8 })
    })

    it('separately tracks AsleepDeep intervals as deepSleepHours, alongside the total', () => {
      const builder = new AppleHealthPatchBuilder()
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierSleepAnalysis',
        value: 'HKCategoryValueSleepAnalysisAsleepCore',
        startDate: '2026-01-15 00:00:00+0000',
        endDate: '2026-01-15 05:00:00+0000',
      })
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierSleepAnalysis',
        value: 'HKCategoryValueSleepAnalysisAsleepDeep',
        startDate: '2026-01-15 05:00:00+0000',
        endDate: '2026-01-15 06:30:00+0000',
      })

      expect(builder.build().get('2026-01-15')).toEqual({
        sleepHours: 6.5,
        deepSleepHours: 1.5,
      })
    })

    it('excludes Awake intervals from the total', () => {
      const builder = new AppleHealthPatchBuilder()
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierSleepAnalysis',
        value: 'HKCategoryValueSleepAnalysisAsleepCore',
        startDate: '2026-01-15 00:00:00+0000',
        endDate: '2026-01-15 04:00:00+0000',
      })
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierSleepAnalysis',
        value: 'HKCategoryValueSleepAnalysisAwake',
        startDate: '2026-01-15 04:00:00+0000',
        endDate: '2026-01-15 04:30:00+0000',
      })
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierSleepAnalysis',
        value: 'HKCategoryValueSleepAnalysisAsleepCore',
        startDate: '2026-01-15 04:30:00+0000',
        endDate: '2026-01-15 07:00:00+0000',
      })

      expect(builder.build().get('2026-01-15')).toEqual({ sleepHours: 6.5 })
    })

    it('falls back to InBed duration only when a source has no Asleep* interval at all that night', () => {
      const builder = new AppleHealthPatchBuilder()
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierSleepAnalysis',
        value: 'HKCategoryValueSleepAnalysisInBed',
        startDate: '2026-01-15 00:00:00+0000',
        endDate: '2026-01-15 07:30:00+0000',
      })

      expect(builder.build().get('2026-01-15')).toEqual({ sleepHours: 7.5 })
    })

    it("keeps only the dominant source's sleep for a night, not the sum across sources", () => {
      const builder = new AppleHealthPatchBuilder()
      // Watch: 7h asleep. A third-party app double-logging the same night
      // via its own 8h InBed interval would double the total if summed.
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierSleepAnalysis',
        value: 'HKCategoryValueSleepAnalysisAsleepCore',
        startDate: '2026-01-15 00:00:00+0000',
        endDate: '2026-01-15 07:00:00+0000',
        sourceName: 'My Watch',
      })
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierSleepAnalysis',
        value: 'HKCategoryValueSleepAnalysisInBed',
        startDate: '2026-01-14 23:30:00+0000',
        endDate: '2026-01-15 07:30:00+0000',
        sourceName: 'Sleep Tracker App',
      })

      expect(builder.build().get('2026-01-15')).toEqual({ sleepHours: 8 })
    })

    it("keeps a pre-midnight deep-sleep segment on the night's own wake date, not the day it ended on (#412)", () => {
      const builder = new AppleHealthPatchBuilder()
      // Falls asleep 22:30 on the 14th, straight into deep sleep — this
      // segment both starts and ends *before* midnight, unlike the rest of
      // the night. Reported live: this exact shape silently dropped the
      // deep-sleep segment from the night it belongs to.
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierSleepAnalysis',
        value: 'HKCategoryValueSleepAnalysisAsleepDeep',
        startDate: '2026-01-14 22:30:00+0000',
        endDate: '2026-01-14 23:15:00+0000',
      })
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierSleepAnalysis',
        value: 'HKCategoryValueSleepAnalysisAsleepCore',
        startDate: '2026-01-14 23:15:00+0000',
        endDate: '2026-01-15 03:00:00+0000',
      })
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierSleepAnalysis',
        value: 'HKCategoryValueSleepAnalysisAsleepREM',
        startDate: '2026-01-15 03:00:00+0000',
        endDate: '2026-01-15 07:00:00+0000',
      })

      const patches = builder.build()
      expect(patches.get('2026-01-14')).toBeUndefined()
      expect(patches.get('2026-01-15')).toEqual({
        sleepHours: 8.5,
        deepSleepHours: 0.75,
      })
    })

    it('does not merge two genuinely separate nights (a full day apart) across the same source', () => {
      const builder = new AppleHealthPatchBuilder()
      // A real previous night, ending in the morning of the 14th.
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierSleepAnalysis',
        value: 'HKCategoryValueSleepAnalysisAsleepCore',
        startDate: '2026-01-13 23:00:00+0000',
        endDate: '2026-01-14 07:00:00+0000',
      })
      // The next real night, many waking hours later.
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierSleepAnalysis',
        value: 'HKCategoryValueSleepAnalysisAsleepDeep',
        startDate: '2026-01-14 23:00:00+0000',
        endDate: '2026-01-15 06:00:00+0000',
      })

      const patches = builder.build()
      expect(patches.get('2026-01-14')).toEqual({ sleepHours: 8 })
      expect(patches.get('2026-01-15')).toEqual({
        sleepHours: 7,
        deepSleepHours: 7,
      })
    })
  })

  describe('menstrual flow (#411)', () => {
    it('maps a real flow record to onPeriod: true', () => {
      const builder = new AppleHealthPatchBuilder()
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierMenstrualFlow',
        value: 'HKCategoryValueMenstrualFlowMedium',
        startDate: '2026-01-15 08:00:00+0000',
      })

      expect(builder.build().get('2026-01-15')).toEqual({ onPeriod: true })
    })

    it('does not set onPeriod for a "None" flow record', () => {
      const builder = new AppleHealthPatchBuilder()
      builder.addRecord({
        type: 'HKCategoryTypeIdentifierMenstrualFlow',
        value: 'HKCategoryValueMenstrualFlowNone',
        startDate: '2026-01-15 08:00:00+0000',
      })

      expect(builder.build().get('2026-01-15')).toBeUndefined()
    })

    it('does not set onPeriod for a date with no flow record at all', () => {
      const builder = new AppleHealthPatchBuilder()
      builder.addRecord({
        type: 'HKQuantityTypeIdentifierBodyMass',
        unit: 'kg',
        value: '61.4',
        startDate: '2026-01-15 12:00:00+0000',
      })

      expect(builder.build().get('2026-01-15')).toEqual({ weightKg: 61.4 })
    })

    it('imports end-to-end from a real-shaped export.xml flow record with metadata, the exact reported bug (#411)', () => {
      // Reported live: real period days in the user's own Apple Health
      // Cycle Tracking showed no marker at all after import. Root cause,
      // reproduced here: a manually-logged MenstrualFlow record carries a
      // <MetadataEntry> child (HKMetadataKeyMenstrualCycleStart), making it
      // a paired, not self-closing, <Record> -- silently dropped by the
      // scanner before this fix, before ever reaching the builder at all.
      const scanner = new AppleHealthRecordScanner()
      const records = scanner.push(
        '<Record type="HKCategoryTypeIdentifierMenstrualFlow" sourceName="Health" ' +
          'startDate="2026-07-11 08:00:00+0000" endDate="2026-07-11 08:00:00+0000" ' +
          'value="HKCategoryValueMenstrualFlowMedium">' +
          '<MetadataEntry key="HKMetadataKeyMenstrualCycleStart" value="1"/>' +
          '</Record>',
      )

      const builder = new AppleHealthPatchBuilder()
      for (const record of records) builder.addRecord(record)

      expect(builder.build().get('2026-07-11')).toEqual({ onPeriod: true })
    })
  })
})
