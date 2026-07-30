import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import {
  filterPatchesToFields,
  mergeDailyEntryPatches,
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

/**
 * Reads a MyFitnessPal "Data Access Request" export client-side and merges
 * its `Foods` (meals) and `Measurement` (weight) rows into this app's
 * `DailyEntry` records. Unlike Zepp Life's export, the actual file the user
 * obtains here is a plain, unencrypted `.xlsx` — no MS-OFFCRYPTO layer to
 * unwrap first (that was the original filing's assumption, based on
 * MyFitnessPal's *other*, Premium-only "Download Your Data" export
 * mechanism, corrected once a real sample was inspected). `exceljs`
 * (already a dependency for the Excel *export* side, `exportXlsx.ts`) reads
 * it the same way it writes one.
 */
export async function importMyFitnessPalExport(
  file: File,
  /** #369-style opt-out, same shape every other importer here already has. */
  includedFields?: ReadonlySet<keyof DailyEntryPatch>,
): Promise<MyFitnessPalImportSummary> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()

  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
    await workbook.xlsx.load(buffer)
  } catch {
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
  )

  await Promise.all(
    entriesToUpsert.map((entry) => dailyEntryRepository.upsert(entry)),
  )

  return { daysImported, daysUpdated }
}
