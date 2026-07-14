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
              emotion: 'neutral',
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
    expect(screen.getByText('Neutral')).toBeInTheDocument()
  })

  it('only shows the date/weight/calories header when standalone', () => {
    const entry = makeEntry({ weightKg: 72.4 })
    const { rerender } = render(<DayDetail entry={entry} />)
    expect(screen.queryByText('72.4 kg')).not.toBeInTheDocument()

    rerender(<DayDetail entry={entry} standalone />)
    expect(screen.getByText('72.4 kg · — kcal')).toBeInTheDocument()
  })
})
