import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import {
  buildZeppLifePatches,
  filterZeppBodyRowsByHeight,
  parseZeppActivityCsv,
  parseZeppBodyCsv,
  parseZeppUserCsv,
  summarizeZeppBodyProfiles,
  type ZeppBodyProfile,
} from './zeppLifeParser'
import {
  filterPatchesToFields,
  mergeDailyEntryPatches,
  type DailyEntryImportMode,
  type DailyEntryPatch,
} from '../mergeDailyEntryPatches'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

export class ZeppLifeWrongPasswordError extends Error {}
export class ZeppLifeInvalidFileError extends Error {}

/** Thrown when BODY rows contain more than one scale height and the caller
 * has not yet picked which person to import (#616). */
export class ZeppLifeMultipleProfilesError extends Error {
  readonly profiles: ZeppBodyProfile[]

  constructor(profiles: ZeppBodyProfile[]) {
    super('Zepp Life export contains multiple body profiles.')
    this.profiles = profiles
  }
}

export interface ZeppLifeImportSummary {
  daysImported: number
  daysUpdated: number
}

const BODY_ENTRY_RE = /^BODY\/BODY_.*\.csv$/
const ACTIVITY_ENTRY_RE = /^ACTIVITY\/ACTIVITY_.*\.csv$/
const USER_ENTRY_RE = /^USER\/USER_.*\.csv$/

/**
 * Decrypts and parses a Zepp Life export zip client-side (no server
 * involved — the password never leaves the browser) and merges its BODY
 * (weight/body-composition) and ACTIVITY (steps) CSVs into this app's
 * `DailyEntry` records. `@zip.js/zip.js` is dynamically imported, same
 * pattern `exportXlsx.ts` uses for `exceljs`, so the (AES-capable, unlike
 * lighter zip libs) dependency is only pulled into a chunk when an import
 * actually runs.
 *
 * #616 — when BODY rows include more than one `height` value (shared
 * scale syncing into one Zepp account) and `selectedHeightCm` is omitted,
 * throws `ZeppLifeMultipleProfilesError` so the UI can ask which person
 * to keep. ACTIVITY is not height-keyed and is imported as-is.
 */
export async function importZeppLifeExport(
  file: File,
  password: string,
  /** #369 — when provided, only these `DailyEntryPatch` fields are applied;
   * omitted entirely (not just an empty set) means "import everything",
   * preserving pre-#369 behavior for any caller that doesn't pass it. */
  includedFields?: ReadonlySet<keyof DailyEntryPatch>,
  /** #496 — defaults to fillGaps inside mergeDailyEntryPatches. */
  importMode?: DailyEntryImportMode,
  /** #616 — when the export has multiple heights, pass the chosen one. */
  selectedHeightCm?: number,
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
    const userEntry = entries.find((e) => USER_ENTRY_RE.test(e.filename))
    if (!bodyEntry && !activityEntry) {
      throw new ZeppLifeInvalidFileError(
        "This doesn't look like a Zepp Life export file.",
      )
    }

    async function readCsv(
      entry: typeof bodyEntry | typeof activityEntry | typeof userEntry,
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

    const [bodyText, activityText, userText] = await Promise.all([
      readCsv(bodyEntry),
      readCsv(activityEntry),
      readCsv(userEntry),
    ])

    let bodyRows = parseZeppBodyCsv(bodyText)
    const activityRows = parseZeppActivityCsv(activityText)
    const account = userText ? parseZeppUserCsv(userText) : undefined
    const profiles = summarizeZeppBodyProfiles(bodyRows, account)

    if (profiles.length > 1) {
      if (selectedHeightCm === undefined) {
        throw new ZeppLifeMultipleProfilesError(profiles)
      }
      bodyRows = filterZeppBodyRowsByHeight(bodyRows, selectedHeightCm)
    }

    const rawPatches = buildZeppLifePatches(bodyRows, activityRows)
    const patches = includedFields
      ? filterPatchesToFields(rawPatches, includedFields)
      : rawPatches

    const existingEntries = await dailyEntryRepository.getAll()
    const { daysImported, daysUpdated, entriesToUpsert } =
      mergeDailyEntryPatches(patches, existingEntries, importMode)

    await Promise.all(
      entriesToUpsert.map((entry) => dailyEntryRepository.upsert(entry)),
    )

    return { daysImported, daysUpdated }
  } finally {
    await reader.close()
  }
}
