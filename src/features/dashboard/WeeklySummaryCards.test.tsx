import { render, screen } from '@testing-library/react'
import { format, startOfISOWeek } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { WeeklySummaryCards } from './WeeklySummaryCards'

function calories(
  amountKcal: number,
  macros: Partial<CalorieEntry> = {},
): CalorieEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      amountKcal,
      createdAt: '2026-01-01T00:00:00.000Z',
      ...macros,
    },
  ]
}

const DATE_FORMAT = 'yyyy-MM-dd'
const WEEK_1_START = format(
  startOfISOWeek(new Date('2026-03-02T00:00:00.000Z')),
  DATE_FORMAT,
)

function dayOf(weekStartIso: string, offset: number): string {
  const d = new Date(`${weekStartIso}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + offset)
  return format(d, DATE_FORMAT)
}

let idCounter = 0
function entry(date: string, overrides: Partial<DailyEntry> = {}): DailyEntry {
  idCounter += 1
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: `entry-${idCounter}`,
    date,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    targetWeeklyLossKg: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('WeeklySummaryCards', () => {
  it('renders nothing when there are no entries', () => {
    const { container } = render(
      <WeeklySummaryCards entries={[]} goal={null} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a dash for the first week (no prior week to compare)', () => {
    const entries = [entry(dayOf(WEEK_1_START, 0), { weightKg: 80 })]
    render(<WeeklySummaryCards entries={entries} goal={null} />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows the signed delta and average calories for a second week', () => {
    const week2Start = dayOf(WEEK_1_START, 7)
    const entries = [
      entry(dayOf(WEEK_1_START, 0), {
        weightKg: 82,
        calorieEntries: calories(2000),
      }),
      entry(dayOf(week2Start, 0), {
        weightKg: 80,
        calorieEntries: calories(1800),
      }),
    ]
    render(
      <WeeklySummaryCards
        entries={entries}
        goal={makeGoal({ targetWeeklyLossKg: 1 })}
      />,
    )

    expect(screen.getByText('-2.0')).toBeInTheDocument()
    expect(screen.getByText(/Average calories: 1,800|1800/)).toBeInTheDocument()
    expect(screen.getByText(/target met/)).toBeInTheDocument()
  })

  it("renders a loss week with the card's full bold treatment", () => {
    const week2Start = dayOf(WEEK_1_START, 7)
    const entries = [
      entry(dayOf(WEEK_1_START, 0), { weightKg: 82 }),
      entry(dayOf(week2Start, 0), { weightKg: 80 }),
    ]
    render(<WeeklySummaryCards entries={entries} goal={null} />)

    expect(screen.getByText('-2.0')).toHaveClass('text-4xl', 'font-semibold')
  })

  it('renders a gain week visually quieter, with no explicit plus sign', () => {
    const week2Start = dayOf(WEEK_1_START, 7)
    const entries = [
      entry(dayOf(WEEK_1_START, 0), { weightKg: 80 }),
      entry(dayOf(week2Start, 0), { weightKg: 80.6 }),
    ]
    render(<WeeklySummaryCards entries={entries} goal={null} />)

    expect(screen.queryByText('+0.6')).not.toBeInTheDocument()
    expect(screen.getByText('0.6')).toHaveClass(
      'text-2xl',
      'font-normal',
      'text-muted-foreground',
    )
  })

  it('renders a no-change week with the same quiet treatment as a gain', () => {
    const week2Start = dayOf(WEEK_1_START, 7)
    const entries = [
      entry(dayOf(WEEK_1_START, 0), { weightKg: 80 }),
      entry(dayOf(week2Start, 0), { weightKg: 80 }),
    ]
    render(<WeeklySummaryCards entries={entries} goal={null} />)

    expect(screen.getByText('0.0')).toHaveClass(
      'text-2xl',
      'font-normal',
      'text-muted-foreground',
    )
  })

  it('shows the average macros for a week alongside average calories (#53)', () => {
    const entries = [
      entry(dayOf(WEEK_1_START, 0), {
        weightKg: 80,
        calorieEntries: calories(2000, { proteinG: 100, fatG: 60 }),
      }),
    ]
    render(<WeeklySummaryCards entries={entries} goal={null} />)

    expect(
      screen.getByText(
        'Average calories: 2,000 · Protein 100g · Fat 60g · Carbs —',
      ),
    ).toBeInTheDocument()
  })

  it('does not show a target-met note for a week that missed target', () => {
    const week2Start = dayOf(WEEK_1_START, 7)
    const entries = [
      entry(dayOf(WEEK_1_START, 0), { weightKg: 80 }),
      entry(dayOf(week2Start, 0), { weightKg: 80 }),
    ]
    render(
      <WeeklySummaryCards
        entries={entries}
        goal={makeGoal({ targetWeeklyLossKg: 1 })}
      />,
    )

    expect(screen.queryByText(/target met/)).not.toBeInTheDocument()
  })

  it('lists weeks most-recent-first', () => {
    const week2Start = dayOf(WEEK_1_START, 7)
    const entries = [
      entry(dayOf(WEEK_1_START, 0), { weightKg: 82 }),
      entry(dayOf(week2Start, 0), { weightKg: 80 }),
    ]
    render(<WeeklySummaryCards entries={entries} goal={null} />)

    const labels = screen.getAllByText(/–/).map((el) => el.textContent)
    expect(labels[0]).not.toEqual(labels[labels.length - 1])
  })
})
