import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { DayDetail } from './DayDetail'

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'entry-1',
    date: '2026-03-01',
    weightKg: 80,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('DayDetail', () => {
  it('shows a quiet fallback when there is nothing logged', () => {
    render(<DayDetail entry={makeEntry()} />)

    expect(
      screen.getByText('Nothing else logged for this day.'),
    ).toBeInTheDocument()
  })

  it('shows the day mood even without a note (#44 gap fix)', () => {
    render(<DayDetail entry={makeEntry({ emotion: 'unhappy' })} />)

    expect(screen.getByText('Unhappy')).toBeInTheDocument()
    expect(
      screen.queryByText('Nothing else logged for this day.'),
    ).not.toBeInTheDocument()
  })

  it('shows the note and meals with their own emotions', () => {
    render(
      <DayDetail
        entry={makeEntry({
          note: 'Went for a long walk',
          emotion: 'happy',
          calorieEntries: [
            {
              id: 'c1',
              amountKcal: 500,
              note: 'Pasta for lunch',
              emotion: 'thumbsUp',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        })}
      />,
    )

    expect(screen.getByText('Went for a long walk')).toBeInTheDocument()
    expect(screen.getByText('Happy')).toBeInTheDocument()
    expect(screen.getByText('Meal 1 — 500 kcal')).toBeInTheDocument()
    expect(screen.getByText('Pasta for lunch')).toBeInTheDocument()
    expect(screen.getByText('Thumbs up')).toBeInTheDocument()
  })

  it("shows a meal's bellissimo reaction as the 🤌 emoji, not an icon (#54)", () => {
    render(
      <DayDetail
        entry={makeEntry({
          calorieEntries: [
            {
              id: 'c1',
              amountKcal: 500,
              emotion: 'bellissimo',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        })}
      />,
    )

    expect(screen.getByText('🤌')).toBeInTheDocument()
    expect(screen.getByText('Bellissimo')).toBeInTheDocument()
  })

  it('only shows the date/weight/calories header when standalone', () => {
    const entry = makeEntry({ weightKg: 72.4 })
    const { rerender } = render(<DayDetail entry={entry} />)
    expect(screen.queryByText('72.4 kg')).not.toBeInTheDocument()

    rerender(<DayDetail entry={entry} standalone />)
    expect(screen.getByText('72.4 kg · — kcal')).toBeInTheDocument()
  })

  it("shows a meal's own macros, omitted when nothing logged for that meal (#52)", () => {
    render(
      <DayDetail
        entry={makeEntry({
          calorieEntries: [
            {
              id: 'c1',
              amountKcal: 500,
              proteinG: 20,
              carbsG: 30,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
            {
              id: 'c2',
              amountKcal: 300,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        })}
      />,
    )

    expect(
      screen.getByText('Protein 20g · Fat — · Carbs 30g'),
    ).toBeInTheDocument()
    // Second meal logged no macros at all — no summary line for it.
    expect(screen.getByText('Meal 2 — 300 kcal')).toBeInTheDocument()
  })

  it("shows the day's macro total in the standalone header (#52)", () => {
    render(
      <DayDetail
        entry={makeEntry({
          calorieEntries: [
            {
              id: 'c1',
              amountKcal: 500,
              proteinG: 20,
              fatG: 10,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        })}
        standalone
      />,
    )

    // Appears twice: the standalone header's day total, and this single
    // meal's own summary line show identical numbers.
    expect(
      screen.getAllByText('Protein 20g · Fat 10g · Carbs —'),
    ).toHaveLength(2)
  })
})
