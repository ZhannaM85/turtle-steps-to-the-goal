import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import {
  buildZeppLifePatches,
  parseZeppActivityCsv,
  parseZeppBodyCsv,
} from './zeppLifeParser'
import { mergeZeppLifePatches } from './zeppLifeMerge'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

export class ZeppLifeWrongPasswordError extends Error {}
export class ZeppLifeInvalidFileError extends Error {}

export interface ZeppLifeImportSummary {
  daysImported: number
  daysUpdated: number
}

const BODY_ENTRY_RE = /^BODY\/BODY_.*\.csv$/
const ACTIVITY_ENTRY_RE = /^ACTIVITY\/ACTIVITY_.*\.csv$/

/**
 * Decrypts and parses a Zepp Life export zip client-side (no server
 * involved — the password never leaves the browser) and merges its BODY
 * (weight/body-composition) and ACTIVITY (steps) CSVs into this app's
 * `DailyEntry` records. `@zip.js/zip.js` is dynamically imported, same
 * pattern `exportXlsx.ts` uses for `exceljs`, so the (AES-capable, unlike
 * lighter zip libs) dependency is only pulled into a chunk when an import
 * actually runs.
 */
export async function importZeppLifeExport(
  file: File,
  password: string,
): Promise<ZeppLifeImportSummary> {
  const { ZipReader, BlobReader, TextWriter, ERR_INVALID_PASSWORD } =
    await import('@zip.js/zip.js')
  const reader = new ZipReader(new BlobReader(file))

  try {
    let entries
    try {
      entries = await reader.getEntries()
    } catch {
      throw new ZeppLifeInvalidFileError(
        "This doesn't look like a Zepp Life export file.",
      )
    }

    const bodyEntry = entries.find((e) => BODY_ENTRY_RE.test(e.filename))
    const activityEntry = entries.find((e) =>
      ACTIVITY_ENTRY_RE.test(e.filename),
    )
    if (!bodyEntry && !activityEntry) {
      throw new ZeppLifeInvalidFileError(
        "This doesn't look like a Zepp Life export file.",
      )
    }

    async function readCsv(
      entry: typeof bodyEntry | typeof activityEntry,
    ): Promise<string> {
      if (!entry || entry.directory) return ''
      try {
        return await entry.getData(new TextWriter(), { password })
      } catch (err) {
        if (err instanceof Error && err.message === ERR_INVALID_PASSWORD) {
          throw new ZeppLifeWrongPasswordError('Incorrect password.')
        }
        throw err
      }
    }

    const [bodyText, activityText] = await Promise.all([
      readCsv(bodyEntry),
      readCsv(activityEntry),
    ])

    const bodyRows = parseZeppBodyCsv(bodyText)
    const activityRows = parseZeppActivityCsv(activityText)
    const patches = buildZeppLifePatches(bodyRows, activityRows)

    const existingEntries = await dailyEntryRepository.getAll()
    const { daysImported, daysUpdated, entriesToUpsert } = mergeZeppLifePatches(
      patches,
      existingEntries,
    )

    await Promise.all(
      entriesToUpsert.map((entry) => dailyEntryRepository.upsert(entry)),
    )

    return { daysImported, daysUpdated }
  } finally {
    await reader.close()
  }
}
