import 'fake-indexeddb/auto'
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import {
  importZeppLifeExport,
  ZeppLifeInvalidFileError,
  ZeppLifeMultipleProfilesError,
  ZeppLifeWrongPasswordError,
} from './importZeppLife'

const PASSWORD = 'correct-horse-battery-staple'

const BODY_CSV =
  'time,weight,height,bmi,fatRate,bodyWaterRate,boneMass,metabolism,muscleRate,visceralFat\n' +
  '2026-01-15 12:00:00+0000,61.4,165.0,22.6,35.5,46.0,2.4,1173.0,37.29,6.0\n'

const BODY_CSV_TWO_HEIGHTS =
  'time,weight,height,bmi,fatRate,bodyWaterRate,boneMass,metabolism,muscleRate,visceralFat\n' +
  '2026-01-15 06:00:00+0000,60.0,160.0,23.4,23.5,52.4,2.38,1471.0,43.61,6.0\n' +
  '2026-01-15 08:00:00+0000,80.0,178.0,25.2,25.8,50.8,2.98,1486.0,55.57,13.0\n'

const ACTIVITY_CSV =
  'date,steps,distance,runDistance,calories\n2026-01-16,8342,6200,0,320\n'

/** Builds a real AES-encrypted zip in-memory the same shape as a Zepp Life
 * export (BODY/ACTIVITY CSVs in their own subfolders), so this exercises
 * `importZeppLifeExport`'s actual zip.js decrypt+extract path rather than
 * just the pure parsing/merge logic already covered by
 * `zeppLifeParser.test.ts`/`zeppLifeMerge.test.ts`. */
async function makeZeppLifeExportFile(
  password: string,
  options?: { bodyCsv?: string; includeUser?: boolean },
): Promise<File> {
  const writer = new ZipWriter(new BlobWriter('application/zip'))
  await writer.add(
    'BODY/BODY_123.csv',
    new TextReader(options?.bodyCsv ?? BODY_CSV),
    { password },
  )
  await writer.add('ACTIVITY/ACTIVITY_123.csv', new TextReader(ACTIVITY_CSV), {
    password,
  })
  if (options?.includeUser) {
    await writer.add(
      'USER/USER_123.csv',
      new TextReader(
        'userId,gender,height,weight,nickName,avatar,birthday\n' +
          '1,1,178.0,80.0,Alex,https://example.com/a.jpg,1976-08\n',
      ),
      { password },
    )
  }
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
    expect(weightEntry).toMatchObject({
      weightKg: 61.4,
      bodyFatPercent: 35.5,
      // #458 — muscleRate is already kg, not weight * rate / 100
      muscleMassKg: 37.29,
      boneMassKg: 2.4,
      bodyWaterPercent: 46.0,
      visceralFatRating: 6.0,
    })
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

  it('throws ZeppLifeMultipleProfilesError when BODY has two heights (#616)', async () => {
    const file = await makeZeppLifeExportFile(PASSWORD, {
      bodyCsv: BODY_CSV_TWO_HEIGHTS,
      includeUser: true,
    })

    await expect(importZeppLifeExport(file, PASSWORD)).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof ZeppLifeMultipleProfilesError &&
        err.profiles.length === 2 &&
        err.profiles[1]?.nickName === 'Alex',
    )
  })

  it('imports only the selected height when multiple profiles exist (#616)', async () => {
    const file = await makeZeppLifeExportFile(PASSWORD, {
      bodyCsv: BODY_CSV_TWO_HEIGHTS,
      includeUser: true,
    })

    const result = await importZeppLifeExport(
      file,
      PASSWORD,
      undefined,
      undefined,
      160,
    )

    expect(result).toEqual({ daysImported: 2, daysUpdated: 0 })
    const weightEntry = await db.dailyEntries
      .where('date')
      .equals('2026-01-15')
      .first()
    expect(weightEntry).toMatchObject({ weightKg: 60.0 })
  })
})
