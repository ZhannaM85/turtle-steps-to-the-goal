import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import {
  importMyFitnessPalExport,
  isMyFitnessPalEncrypted,
  MyFitnessPalInvalidFileError,
  MyFitnessPalPasswordRequiredError,
  MyFitnessPalWrongPasswordError,
} from './importMyFitnessPal'

// Confirmed real 40-column header from the user's own Data Access Request
// export (2026-07-30) -- only a handful of these columns are ever read, but
// the full header is used here so column-index lookups behave exactly as
// they would against the real file, not a hand-trimmed stand-in.
const HEADER = [
  'username',
  'user_id',
  'email',
  'country_code',
  'ip_address',
  'height_in_inches',
  'sex',
  'dob',
  'zipcode',
  'account_deleted',
  'current_premium_subscriber',
  'current_trial',
  'item_type',
  'date',
  'description',
  'value',
  'unit',
  'calories',
  'fat_g',
  'saturated_fat_g',
  'trans_fat_g',
  'polyunsaturated_fat_g',
  'monounsaturated_fat_g',
  'cholesterol_mg',
  'sodium_mg',
  'carbs_g',
  'fiber_g',
  'sugar_g',
  'added_sugar_g',
  'sugar_alcohols_g',
  'protein_g',
  'vitamin_d_pct_daily_value',
  'calcium_mg',
  'iron_pct_daily_value',
  'potassium_mg',
  'vitamin_a_pct_daily_value',
  'vitamin_c_pct_daily_value',
  'created_at',
  'updated_at',
  'details_json',
]

function rowFor(values: Partial<Record<string, unknown>>): unknown[] {
  return HEADER.map((name) => values[name] ?? '')
}

/** Builds a real .xlsx File in-memory shaped like the confirmed real export
 * (row 1 title, row 2 the 40-column header, data from row 3) -- exercises
 * `importMyFitnessPalExport`'s actual exceljs read path, not just the pure
 * parsing/mapping logic already covered by `myFitnessPalParser.test.ts`. */
async function makeMyFitnessPalExportFile(
  dataRows: Partial<Record<string, unknown>>[],
): Promise<File> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Sheet 1 - someuser Data')
  sheet.addRow(['MyFitnessPal Data Export'])
  sheet.addRow(HEADER)
  for (const row of dataRows) sheet.addRow(rowFor(row))
  const buffer = await workbook.xlsx.writeBuffer()
  return new File([buffer], 'mfp-export.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/** #500 — wraps a plain workbook in MS-OFFCRYPTO encryption so the decrypt
 * + password path is exercised end-to-end, not only the OLE magic check. */
async function makeEncryptedMyFitnessPalExportFile(
  dataRows: Partial<Record<string, unknown>>[],
  password: string,
): Promise<File> {
  const plain = await makeMyFitnessPalExportFile(dataRows)
  const officeCrypto = (await import('officecrypto-tool')).default
  const encrypted = officeCrypto.encrypt(
    Buffer.from(await plain.arrayBuffer()),
    { password },
  )
  return new File([Uint8Array.from(encrypted)], 'mfp-export-encrypted.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

beforeEach(async () => {
  await db.dailyEntries.clear()
})

afterEach(async () => {
  await db.dailyEntries.clear()
})

describe('importMyFitnessPalExport', () => {
  it('imports weight and grouped meals, ignoring out-of-scope item_types', async () => {
    const file = await makeMyFitnessPalExportFile([
      {
        item_type: 'Measurement',
        date: '2026-01-15',
        description: 'weight',
        value: 72.4,
        unit: 'kilograms',
      },
      {
        item_type: 'Foods',
        date: '2026-01-15',
        description: 'Oatmeal',
        calories: 300,
        protein_g: 10,
        fat_g: 5,
        carbs_g: 50,
        fiber_g: 8,
        details_json: JSON.stringify({
          meal: 'Breakfast',
          brand_name: 'Quaker',
        }),
      },
      {
        item_type: 'Foods',
        date: '2026-01-15',
        description: 'Chicken breast',
        calories: 400,
        details_json: JSON.stringify({ meal: 'Dinner' }),
      },
      // Out of scope -- must not surface as anything.
      { item_type: 'Steps', date: '2026-01-15', value: 8000 },
      { item_type: 'Exercise', date: '2026-01-15', description: 'Running' },
    ])

    const result = await importMyFitnessPalExport(file)

    expect(result).toEqual({ daysImported: 1, daysUpdated: 0 })
    const entry = await db.dailyEntries.get({ date: '2026-01-15' })
    expect(entry?.weightKg).toBe(72.4)
    expect(entry?.calorieEntries).toHaveLength(2)
    const breakfast = entry?.calorieEntries?.find(
      (e) => e.label === 'Breakfast',
    )
    expect(breakfast?.items[0]).toMatchObject({
      name: 'Oatmeal',
      brand: 'Quaker',
      amountKcal: 300,
    })
  })

  it('merges imported meals alongside an already-logged meal for the same date, not replacing it (#367)', async () => {
    await db.dailyEntries.put({
      id: 'existing-1',
      date: '2026-01-15',
      calorieEntries: [
        {
          id: 'hand-logged',
          items: [{ id: 'i1', name: 'Homemade soup', amountKcal: 250 }],
          createdAt: '2026-01-15T08:00:00.000Z',
        },
      ],
      createdAt: '2026-01-15T08:00:00.000Z',
      updatedAt: '2026-01-15T08:00:00.000Z',
    })

    const file = await makeMyFitnessPalExportFile([
      {
        item_type: 'Foods',
        date: '2026-01-15',
        description: 'Oatmeal',
        calories: 300,
        details_json: JSON.stringify({ meal: 'Breakfast' }),
      },
    ])

    const result = await importMyFitnessPalExport(file)

    expect(result).toEqual({ daysImported: 1, daysUpdated: 1 })
    const entry = await db.dailyEntries.get({ date: '2026-01-15' })
    expect(entry?.calorieEntries).toHaveLength(2)
    expect(entry?.calorieEntries?.[0].id).toBe('hand-logged')
    expect(entry?.calorieEntries?.[1].items[0].name).toBe('Oatmeal')
  })

  it('respects includedFields, e.g. importing only weight and skipping meals', async () => {
    const file = await makeMyFitnessPalExportFile([
      {
        item_type: 'Measurement',
        date: '2026-01-15',
        description: 'weight',
        value: 72.4,
        unit: 'kilograms',
      },
      {
        item_type: 'Foods',
        date: '2026-01-15',
        description: 'Oatmeal',
        calories: 300,
        details_json: JSON.stringify({ meal: 'Breakfast' }),
      },
    ])

    await importMyFitnessPalExport(file, new Set(['weightKg']))

    const entry = await db.dailyEntries.get({ date: '2026-01-15' })
    expect(entry?.weightKg).toBe(72.4)
    expect(entry?.calorieEntries).toBeUndefined()
  })

  it('rejects a file with no recognizable header', async () => {
    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Sheet1')
    sheet.addRow(['not', 'a', 'real', 'export'])
    const buffer = await workbook.xlsx.writeBuffer()
    const file = new File([buffer], 'wrong.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    await expect(importMyFitnessPalExport(file)).rejects.toThrow(
      MyFitnessPalInvalidFileError,
    )
  })

  it('rejects a file that is not a real workbook at all', async () => {
    const file = new File(['not an xlsx file'], 'bogus.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    await expect(importMyFitnessPalExport(file)).rejects.toThrow(
      MyFitnessPalInvalidFileError,
    )
  })

  it(
    'decrypts an MS-OFFCRYPTO-encrypted export with the right password (#500)',
    async () => {
      const file = await makeEncryptedMyFitnessPalExportFile(
        [
          {
            item_type: 'Measurement',
            date: '2026-01-15',
            description: 'weight',
            value: 72.4,
            unit: 'kilograms',
          },
        ],
        '833439',
      )

      expect(isMyFitnessPalEncrypted(await file.arrayBuffer())).toBe(true)

      await expect(importMyFitnessPalExport(file)).rejects.toThrow(
        MyFitnessPalPasswordRequiredError,
      )
      await expect(
        importMyFitnessPalExport(file, undefined, undefined, 'wrong'),
      ).rejects.toThrow(MyFitnessPalWrongPasswordError)

      const result = await importMyFitnessPalExport(
        file,
        undefined,
        undefined,
        '833439',
      )
      expect(result).toEqual({ daysImported: 1, daysUpdated: 0 })
      const entry = await db.dailyEntries.get({ date: '2026-01-15' })
      expect(entry?.weightKg).toBe(72.4)
    },
    // Encrypt + two decrypt attempts each run ~100k SHA iterations —
    // default 5s is too tight under load.
    30_000,
  )
})
