import type { Worksheet } from 'exceljs'
import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { getDictionary } from '@/i18n'
import { buildExportWorkbook } from './exportXlsx'

const t = getDictionary('en')

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'goal-1',
    targetWeeklyLossKg: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = '2026-03-01T00:00:00.000Z'
  return {
    id: 'entry-1',
    date: '2026-03-01',
    weightKg: 80,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function sheetRows(sheet: Worksheet): unknown[][] {
  // getSheetValues() is 1-indexed (row 0 is always empty) — drop it, and
  // drop the header row too, callers only care about data rows.
  return sheet.getSheetValues().slice(2) as unknown[][]
}

describe('buildExportWorkbook', () => {
  it('creates the three expected sheets', async () => {
    const workbook = await buildExportWorkbook([], [], t)

    expect(workbook.worksheets.map((s) => s.name)).toEqual([
      'Daily Log',
      'Meals',
      'Goals',
    ])
  })

  it('writes one Daily Log row per entry with totals computed across meals', async () => {
    const entry = makeEntry({
      weightKg: 79.5,
      sleepHours: 7,
      deepSleepHours: 1.5,
      steps: 8000,
      note: 'Felt good',
      emotion: 'happy',
      onPeriod: true,
      calorieEntries: [
        {
          id: 'meal-1',
          items: [
            { id: 'item-1', amountKcal: 200, proteinG: 10, fatG: 5 },
            { id: 'item-2', amountKcal: 100, carbsG: 20 },
          ],
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    })
    const workbook = await buildExportWorkbook([], [entry], t)
    const dailyLog = workbook.getWorksheet('Daily Log')!
    const [row] = sheetRows(dailyLog)

    // [date, weight, calories, protein, fat, carbs, sleepHours,
    //  deepSleepHours, steps, mood, note, onPeriod, hadConstipation]
    expect(row[1]).toBeInstanceOf(Date)
    expect(row[2]).toBe(79.5)
    expect(row[3]).toBe(300)
    expect(row[4]).toBe(10)
    expect(row[5]).toBe(5)
    expect(row[6]).toBe(20)
    expect(row[7]).toBe(7)
    expect(row[8]).toBe(1.5)
    expect(row[9]).toBe(8000)
    expect(row[10]).toBe('Happy')
    expect(row[11]).toBe('Felt good')
    expect(row[12]).toBe(true)
    expect(row[13]).toBeUndefined()
  })

  it('writes one Meals row per logged item, using the meal label or positional fallback', async () => {
    const entry = makeEntry({
      calorieEntries: [
        {
          id: 'meal-1',
          label: 'Breakfast',
          timeEaten: '08:00',
          items: [
            {
              id: 'item-1',
              name: 'Toast',
              amountKcal: 150,
              amountG: 60,
              emotion: 'thumbsUp',
            },
          ],
          createdAt: '2026-03-01T00:00:00.000Z',
        },
        {
          id: 'meal-2',
          items: [{ id: 'item-2', name: 'Apple', amountKcal: 95 }],
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    })
    const workbook = await buildExportWorkbook([], [entry], t)
    const meals = workbook.getWorksheet('Meals')!
    const rows = sheetRows(meals)

    expect(rows).toHaveLength(2)
    // [date, meal, item, calories, protein, fat, carbs, grams, time, reaction, note]
    expect(rows[0][2]).toBe('Breakfast')
    expect(rows[0][3]).toBe('Toast')
    expect(rows[0][4]).toBe(150)
    expect(rows[0][8]).toBe(60)
    expect(rows[0][9]).toBe('08:00')
    expect(rows[0][10]).toBe('Thumbs up')
    expect(rows[1][2]).toBe('Lunch')
    expect(rows[1][3]).toBe('Apple')
  })

  it('writes one Goals row per goal', async () => {
    const workbook = await buildExportWorkbook(
      [makeGoal({ targetWeeklyLossKg: 0.5 })],
      [],
      t,
    )
    const goals = workbook.getWorksheet('Goals')!
    const [row] = sheetRows(goals)

    expect(row[1]).toBeInstanceOf(Date)
    expect(row[2]).toBe(0.5)
  })

  it('handles no data at all', async () => {
    const workbook = await buildExportWorkbook([], [], t)

    expect(sheetRows(workbook.getWorksheet('Daily Log')!)).toHaveLength(0)
    expect(sheetRows(workbook.getWorksheet('Meals')!)).toHaveLength(0)
    expect(sheetRows(workbook.getWorksheet('Goals')!)).toHaveLength(0)
  })

  it('sorts entries by date ascending, regardless of input order', async () => {
    const entries = [
      makeEntry({ id: 'e2', date: '2026-03-02', weightKg: 79 }),
      makeEntry({ id: 'e1', date: '2026-03-01', weightKg: 80 }),
    ]
    const workbook = await buildExportWorkbook([], entries, t)
    const rows = sheetRows(workbook.getWorksheet('Daily Log')!)

    expect(rows[0][2]).toBe(80)
    expect(rows[1][2]).toBe(79)
  })
})
