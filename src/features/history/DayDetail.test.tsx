import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { useCycleTrackingStore, useDigestionTrackingStore } from '@/stores'
import { DayDetail } from './DayDetail'

beforeEach(() => {
  useCycleTrackingStore.setState({ enabled: false })
  useDigestionTrackingStore.setState({ enabled: false })
})

afterEach(() => {
  useCycleTrackingStore.setState({ enabled: false })
  useDigestionTrackingStore.setState({ enabled: false })
})

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
              items: [{ id: 'i1', amountKcal: 500, emotion: 'thumbsUp' }],
              note: 'Pasta for lunch',
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
              items: [{ id: 'i1', amountKcal: 500, emotion: 'bellissimo' }],
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
              items: [{ id: 'i1', amountKcal: 500, proteinG: 20, carbsG: 30 }],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
            {
              id: 'c2',
              items: [{ id: 'i2', amountKcal: 300 }],
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
              items: [{ id: 'i1', amountKcal: 500, proteinG: 20, fatG: 10 }],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        })}
        standalone
      />,
    )

    // Appears twice: the standalone header's day total, and this single
    // meal's own summary line show identical numbers.
    expect(screen.getAllByText('Protein 20g · Fat 10g · Carbs —')).toHaveLength(
      2,
    )
  })

  describe('cycle tracking toggle (#71)', () => {
    it('is hidden when the Settings toggle is off, even with onSaved provided', () => {
      render(<DayDetail entry={makeEntry()} onSaved={vi.fn()} />)
      expect(
        screen.queryByRole('button', { name: 'On period' }),
      ).not.toBeInTheDocument()
    })

    it('is hidden when onSaved is not provided, even with the Settings toggle on', () => {
      useCycleTrackingStore.setState({ enabled: true })
      render(<DayDetail entry={makeEntry()} />)
      expect(
        screen.queryByRole('button', { name: 'On period' }),
      ).not.toBeInTheDocument()
    })

    it('toggles onPeriod via onSaved when both are present', async () => {
      useCycleTrackingStore.setState({ enabled: true })
      const onSaved = vi.fn()
      render(<DayDetail entry={makeEntry()} onSaved={onSaved} />)

      const toggle = screen.getByRole('button', { name: 'On period' })
      expect(toggle).toHaveAttribute('aria-pressed', 'false')

      toggle.click()

      expect(onSaved).toHaveBeenCalledTimes(1)
      expect(onSaved.mock.calls[0][0].onPeriod).toBe(true)
    })

    it('reflects an already-true onPeriod as pressed', () => {
      useCycleTrackingStore.setState({ enabled: true })
      render(
        <DayDetail entry={makeEntry({ onPeriod: true })} onSaved={vi.fn()} />,
      )

      expect(screen.getByRole('button', { name: 'On period' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })
  })

  describe('digestion tracking toggle', () => {
    it('is hidden when the Settings toggle is off, even with onSaved provided', () => {
      render(<DayDetail entry={makeEntry()} onSaved={vi.fn()} />)
      expect(
        screen.queryByRole('button', { name: 'Bowel movement' }),
      ).not.toBeInTheDocument()
    })

    it('is hidden when onSaved is not provided, even with the Settings toggle on', () => {
      useDigestionTrackingStore.setState({ enabled: true })
      render(<DayDetail entry={makeEntry()} />)
      expect(
        screen.queryByRole('button', { name: 'Bowel movement' }),
      ).not.toBeInTheDocument()
    })

    it('toggles hadBowelMovement via onSaved when both are present', () => {
      useDigestionTrackingStore.setState({ enabled: true })
      const onSaved = vi.fn()
      render(<DayDetail entry={makeEntry()} onSaved={onSaved} />)

      const toggle = screen.getByRole('button', { name: 'Bowel movement' })
      expect(toggle).toHaveAttribute('aria-pressed', 'false')

      toggle.click()

      expect(onSaved).toHaveBeenCalledTimes(1)
      expect(onSaved.mock.calls[0][0].hadBowelMovement).toBe(true)
    })

    it('reflects an already-true hadBowelMovement as pressed', () => {
      useDigestionTrackingStore.setState({ enabled: true })
      render(
        <DayDetail
          entry={makeEntry({ hadBowelMovement: true })}
          onSaved={vi.fn()}
        />,
      )

      expect(
        screen.getByRole('button', { name: 'Bowel movement' }),
      ).toHaveAttribute('aria-pressed', 'true')
    })

    it('shows both toggles together when both preferences are on', () => {
      useCycleTrackingStore.setState({ enabled: true })
      useDigestionTrackingStore.setState({ enabled: true })
      render(<DayDetail entry={makeEntry()} onSaved={vi.fn()} />)

      expect(
        screen.getByRole('button', { name: 'On period' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Bowel movement' }),
      ).toBeInTheDocument()
    })
  })
})
