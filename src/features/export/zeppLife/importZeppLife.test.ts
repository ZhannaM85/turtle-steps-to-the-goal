import 'fake-indexeddb/auto'
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import {
  importZeppLifeExport,
  ZeppLifeInvalidFileError,
  ZeppLifeWrongPasswordError,
} from './importZeppLife'

const PASSWORD = 'correct-horse-battery-staple'

const BODY_CSV =
  'time,weight,height,bmi,fatRate,bodyWaterRate,boneMass,metabolism,muscleRate,visceralFat\n' +
  '2026-01-15 12:00:00+0000,61.4,165.0,22.6,35.5,46.0,2.4,1173.0,37.29,6.0\n'

const ACTIVITY_CSV =
  'date,steps,distance,runDistance,calories\n2026-01-16,8342,6200,0,320\n'

/** Builds a real AES-encrypted zip in-memory the same shape as a Zepp Life
 * export (BODY/ACTIVITY CSVs in their own subfolders), so this exercises
 * `importZeppLifeExport`'s actual zip.js decrypt+extract path rather than
 * just the pure parsing/merge logic already covered by
 * `zeppLifeParser.test.ts`/`zeppLifeMerge.test.ts`. */
async function makeZeppLifeExportFile(password: string): Promise<File> {
  const writer = new ZipWriter(new BlobWriter('application/zip'))
  await writer.add('BODY/BODY_123.csv', new TextReader(BODY_CSV), { password })
  await writer.add('ACTIVITY/ACTIVITY_123.csv', new TextReader(ACTIVITY_CSV), {
    password,
  })
  const blob = await writer.close()
  // Built from the Blob's raw bytes, not the Blob itself — `new File([blob],
  // ...)` silently truncates under jsdom on Node 22 (reproduced: a real
  // 271-byte zip Blob became a 13-byte File), a jsdom/Node polyfill quirk
  // that only affects this hand-built test fixture — a real browser file
  // input hands `importZeppLifeExport` a genuine `File` directly, never one
  // constructed from an existing Blob this way.
  const buffer = await blob.arrayBuffer()
  return new File([buffer], 'export.zip', { type: 'application/zip' })
}

beforeEach(async () => {
  await db.dailyEntries.clear()
})

afterEach(async () => {
  await db.dailyEntries.clear()
})

describe('importZeppLifeExport', () => {
  it('decrypts, parses, and writes DailyEntry records for BODY and ACTIVITY rows', async () => {
    const file = await makeZeppLifeExportFile(PASSWORD)

    const result = await importZeppLifeExport(file, PASSWORD)

    expect(result).toEqual({ daysImported: 2, daysUpdated: 0 })
    const weightEntry = await db.dailyEntries
      .where('date')
      .equals('2026-01-15')
      .first()
    expect(weightEntry).toMatchObject({ weightKg: 61.4, bodyFatPercent: 35.5 })
    const stepsEntry = await db.dailyEntries
      .where('date')
      .equals('2026-01-16')
      .first()
    expect(stepsEntry).toMatchObject({ steps: 8342 })
  })

  it('only imports the selected fields when includedFields is given (#369)', async () => {
    const file = await makeZeppLifeExportFile(PASSWORD)

    const result = await importZeppLifeExport(
      file,
      PASSWORD,
      new Set(['steps']),
    )

    // The BODY row's date (weight-only) has no fields left after filtering
    // to just steps, so it's dropped entirely rather than imported empty.
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
    expect(stepsEntry).toMatchObject({ steps: 8342 })
  })

  it('throws ZeppLifeWrongPasswordError for an incorrect password', async () => {
    const file = await makeZeppLifeExportFile(PASSWORD)

    await expect(
      importZeppLifeExport(file, 'wrong-password'),
    ).rejects.toBeInstanceOf(ZeppLifeWrongPasswordError)
  })

  it('throws ZeppLifeInvalidFileError for a zip with no BODY/ACTIVITY entries', async () => {
    const writer = new ZipWriter(new BlobWriter('application/zip'))
    await writer.add(
      'USER/USER_123.csv',
      new TextReader('userId,gender\n1,0\n'),
    )
    const blob = await writer.close()
    const buffer = await blob.arrayBuffer()
    const file = new File([buffer], 'export.zip', { type: 'application/zip' })

    await expect(importZeppLifeExport(file, PASSWORD)).rejects.toBeInstanceOf(
      ZeppLifeInvalidFileError,
    )
  })
})
