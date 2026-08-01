import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import {
  filterPatchesToFields,
  mergeDailyEntryPatches,
  type DailyEntryImportMode,
  type DailyEntryPatch,
} from '../mergeDailyEntryPatches'
import {
  buildMyFitnessPalPatches,
  cellToDateString,
  cellToNumber,
  cellToString,
  type MyFitnessPalRow,
} from './myFitnessPalParser'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

export class MyFitnessPalInvalidFileError extends Error {}
export class MyFitnessPalWrongPasswordError extends Error {}
/** Encrypted export picked without a password yet — UI should open the
 * password dialog rather than showing a fatal "invalid file" error. */
export class MyFitnessPalPasswordRequiredError extends Error {}

export interface MyFitnessPalImportSummary {
  daysImported: number
  daysUpdated: number
}

// #367 — confirmed from a real Data Access Request export: one flat sheet,
// row 1 a title, row 2 a 41-column header, data from row 3. Every row
// carries a `item_type` discriminator instead of one file per category the
// way Zepp Life/Apple Health do, so this reads columns by name (built from
// row 2) rather than assuming a fixed position — the export's own column
// order isn't part of what was confirmed, only the names below.
const HEADER_ROW_NUMBER = 2
const FIRST_DATA_ROW_NUMBER = 3
const REQUIRED_COLUMNS = ['item_type', 'date'] as const

/** OLE Compound Document magic (`D0 CF 11 E0…`) — MS-OFFCRYPTO-encrypted
 * Office files use this wrapper instead of the plain ZIP (`PK`) that an
 * unencrypted `.xlsx` starts with (#500). */
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0] as const

/**
 * True when the bytes look like an OLE compound document (password-
 * protected MyFitnessPal Data Access Request exports), as opposed to a
 * plain ZIP-based `.xlsx`. Used by the Settings UI to decide whether to
 * open the password dialog before calling {@link importMyFitnessPalExport}.
 */
export function isMyFitnessPalEncrypted(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < OLE_MAGIC.length) return false
  const bytes = new Uint8Array(buffer)
  return OLE_MAGIC.every((b, i) => bytes[i] === b)
}

async function decryptMyFitnessPalWorkbook(
  buffer: ArrayBuffer,
  password: string,
): Promise<ArrayBuffer> {
  // Dynamically imported like exceljs / @zip.js — only pulled in when an
  // encrypted MFP export is actually unlocked (#500).
  const officeCrypto = (await import('officecrypto-tool')).default
  try {
    const decrypted = await officeCrypto.decrypt(Buffer.from(buffer), {
      password,
    })
    // Copy into a fresh ArrayBuffer — Buffer's `.buffer` may be a larger
    // SharedArrayBuffer-backed view, which exceljs/`xlsx.load` doesn't
    // accept as `ArrayBuffer`.
    return Uint8Array.from(decrypted).buffer
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.toLowerCase().includes('password')
    ) {
      throw new MyFitnessPalWrongPasswordError('Incorrect password.')
    }
    throw new MyFitnessPalInvalidFileError(
      "This doesn't look like a MyFitnessPal export file.",
    )
  }
}

/**
 * Reads a MyFitnessPal "Data Access Request" export client-side and merges
 * its `Foods` (meals) and `Measurement` (weight) rows into this app's
 * `DailyEntry` records.
 *
 * #367 assumed a plain unencrypted `.xlsx`. #500 confirmed the live export
 * the user actually receives is often an MS-OFFCRYPTO-encrypted OLE file
 * (still named `.xlsx`) whose password arrives in the same email — so this
 * optionally decrypts first (via `officecrypto-tool`) when a password is
 * provided. Unencrypted plain `.xlsx` exports still work without one.
 * `exceljs` (already a dependency for the Excel *export* side) reads the
 * resulting workbook the same way it writes one.
 */
export async function importMyFitnessPalExport(
  file: File,
  /** #369-style opt-out, same shape every other importer here already has. */
  includedFields?: ReadonlySet<keyof DailyEntryPatch>,
  /** #496 — defaults to fillGaps inside mergeDailyEntryPatches. */
  importMode?: DailyEntryImportMode,
  /** #500 — required when the picked file is MS-OFFCRYPTO-encrypted. */
  password?: string,
): Promise<MyFitnessPalImportSummary> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()

  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
    if (isMyFitnessPalEncrypted(buffer)) {
      if (!password) {
        throw new MyFitnessPalPasswordRequiredError(
          'This MyFitnessPal export is password-protected.',
        )
      }
      buffer = await decryptMyFitnessPalWorkbook(buffer, password)
    }
    await workbook.xlsx.load(buffer)
  } catch (err) {
    if (
      err instanceof MyFitnessPalWrongPasswordError ||
      err instanceof MyFitnessPalPasswordRequiredError ||
      err instanceof MyFitnessPalInvalidFileError
    ) {
      throw err
    }
    throw new MyFitnessPalInvalidFileError(
      "This doesn't look like a MyFitnessPal export file.",
    )
  }

  const worksheet = workbook.worksheets[0]
  const headerRow = worksheet?.getRow(HEADER_ROW_NUMBER)
  if (!worksheet || !headerRow) {
    throw new MyFitnessPalInvalidFileError(
      "This doesn't look like a MyFitnessPal export file.",
    )
  }

  const columnIndexByName = new Map<string, number>()
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const name = cellToString(cell.value)
    if (name) columnIndexByName.set(name, colNumber)
  })
  if (!REQUIRED_COLUMNS.every((name) => columnIndexByName.has(name))) {
    throw new MyFitnessPalInvalidFileError(
      "This doesn't look like a MyFitnessPal export file.",
    )
  }

  function cell(row: ReturnType<typeof worksheet.getRow>, columnName: string) {
    const index = columnIndexByName.get(columnName)
    return index === undefined ? undefined : row.getCell(index).value
  }

  const rows: MyFitnessPalRow[] = []
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < FIRST_DATA_ROW_NUMBER) return
    const itemType = cellToString(cell(row, 'item_type'))
    const date = cellToDateString(cell(row, 'date'))
    if (!date) return

    if (itemType === 'Measurement') {
      rows.push({
        type: 'Measurement',
        date,
        description: cellToString(cell(row, 'description')),
        value: cellToNumber(cell(row, 'value')),
        unit: cellToString(cell(row, 'unit')),
      })
    } else if (itemType === 'Foods') {
      rows.push({
        type: 'Foods',
        date,
        description: cellToString(cell(row, 'description')),
        calories: cellToNumber(cell(row, 'calories')),
        proteinG: cellToNumber(cell(row, 'protein_g')),
        fatG: cellToNumber(cell(row, 'fat_g')),
        carbsG: cellToNumber(cell(row, 'carbs_g')),
        fiberG: cellToNumber(cell(row, 'fiber_g')),
        detailsJson: cellToString(cell(row, 'details_json')),
      })
    }
    // Every other real item_type (Daily Nutrition Totals, Steps, User Food,
    // Exercise, Water, User Recipe, User Preferences) is out of scope per
    // the issue's own resolved priority -- skipped, not an error.
  })

  const rawPatches = buildMyFitnessPalPatches(rows)
  const patches = includedFields
    ? filterPatchesToFields(rawPatches, includedFields)
    : rawPatches

  const existingEntries = await dailyEntryRepository.getAll()
  const { daysImported, daysUpdated, entriesToUpsert } = mergeDailyEntryPatches(
    patches,
    existingEntries,
    importMode,
  )

  await Promise.all(
    entriesToUpsert.map((entry) => dailyEntryRepository.upsert(entry)),
  )

  return { daysImported, daysUpdated }
}
