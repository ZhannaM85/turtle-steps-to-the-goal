import 'fake-indexeddb/auto'
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import {
  AppleHealthInvalidFileError,
  importAppleHealthExport,
} from './importAppleHealth'

const SAMPLE_XML =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<HealthData locale="en_US">\n' +
  '<ExportDate value="2026-07-27 00:00:00 +0000"/>\n' +
  '<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Health" unit="kg" ' +
  'creationDate="2026-01-15 12:00:00 +0000" startDate="2026-01-15 12:00:00 +0000" ' +
  'endDate="2026-01-15 12:00:00 +0000" value="61.4"/>\n' +
  '<Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" ' +
  'creationDate="2026-01-16 09:00:00 +0000" startDate="2026-01-16 08:00:00 +0000" ' +
  'endDate="2026-01-16 08:10:00 +0000" value="500"/>\n' +
  '<Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" ' +
  'creationDate="2026-01-16 13:00:00 +0000" startDate="2026-01-16 12:00:00 +0000" ' +
  'endDate="2026-01-16 12:10:00 +0000" value="300"/>\n' +
  '</HealthData>\n'

/** Builds a small, unencrypted zip in-memory shaped like a real Apple
 * Health export (the main XML filename may vary by locale, plus an unrelated
 * workout-routes file that must be ignored) — exercises
 * `importAppleHealthExport`'s actual zip.js streaming-extraction path, not
 * just the pure parsing/mapping logic already covered by
 * `appleHealthParser.test.ts`. */
async function makeAppleHealthExportFile(
  xml: string,
  xmlFilename = 'apple_health_export/export.xml',
): Promise<File> {
  const writer = new ZipWriter(new BlobWriter('application/zip'))
  await writer.add(xmlFilename, new TextReader(xml))
  await writer.add(
    'apple_health_export/workout-routes/route_2025-01-01.gpx',
    new TextReader('<gpx></gpx>'),
  )
  await writer.add(
    'apple_health_export/export_cda.xml',
    new TextReader('<ClinicalDocument></ClinicalDocument>'),
  )
  const blob = await writer.close()
  // Built from the Blob's raw bytes, not the Blob itself — see the
  // matching comment in zeppLife/importZeppLife.test.ts for why.
  const buffer = await blob.arrayBuffer()
  return new File([buffer], 'export.zip', { type: 'application/zip' })
}

beforeEach(async () => {
  await db.dailyEntries.clear()
})

afterEach(async () => {
  await db.dailyEntries.clear()
})

describe('importAppleHealthExport', () => {
  it('streams, parses, and writes DailyEntry records, ignoring non-export.xml entries', async () => {
    const file = await makeAppleHealthExportFile(SAMPLE_XML)
    const progressSamples: number[] = []

    const result = await importAppleHealthExport(file, (fraction) => {
      progressSamples.push(fraction)
    })

    expect(result).toEqual({ daysImported: 2, daysUpdated: 0 })
    const weightEntry = await db.dailyEntries
      .where('date')
      .equals('2026-01-15')
      .first()
    expect(weightEntry).toMatchObject({ weightKg: 61.4 })
    const stepsEntry = await db.dailyEntries
      .where('date')
      .equals('2026-01-16')
      .first()
    expect(stepsEntry).toMatchObject({ steps: 800 })
    expect(progressSamples.length).toBeGreaterThan(0)
  })

  it('only imports the selected fields when includedFields is given (#369)', async () => {
    const file = await makeAppleHealthExportFile(SAMPLE_XML)

    const result = await importAppleHealthExport(
      file,
      undefined,
      new Set(['steps']),
    )

    // The weight-only date has no fields left after filtering to just
    // steps, so it's dropped entirely rather than imported empty.
    expect(result).toEqual({ daysImported: 1, daysUpdated: 0 })
    const weightEntry = await db.dailyEntries
      .where('date')
      .equals('2026-01-15')
      .first()
    expect(weightEntry).toBeUndefined()
    const stepsEntry = await db.dailyEntries
      .where('date')
      .equals('2026-01-16')
      .first()
    expect(stepsEntry).toMatchObject({ steps: 800 })
  })

  it('accepts a locale-specific main XML filename instead of only export.xml (#618)', async () => {
    const file = await makeAppleHealthExportFile(
      SAMPLE_XML,
      'apple_health_export/экспорт.xml',
    )

    const result = await importAppleHealthExport(file)

    expect(result).toEqual({ daysImported: 2, daysUpdated: 0 })
    const weightEntry = await db.dailyEntries
      .where('date')
      .equals('2026-01-15')
      .first()
    expect(weightEntry).toMatchObject({ weightKg: 61.4 })
  })

  it('throws AppleHealthInvalidFileError for a zip with no Apple Health data XML entry', async () => {
    const writer = new ZipWriter(new BlobWriter('application/zip'))
    await writer.add('some-other-file.txt', new TextReader('not health data'))
    const blob = await writer.close()
    const buffer = await blob.arrayBuffer()
    const file = new File([buffer], 'export.zip', { type: 'application/zip' })

    await expect(importAppleHealthExport(file)).rejects.toBeInstanceOf(
      AppleHealthInvalidFileError,
    )
  })
})
