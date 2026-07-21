import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import type { CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { useDashboardChartVisibilityStore } from '@/stores'
import { MacroTrendChart } from './MacroTrendChart'

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

function item(overrides: Partial<CalorieItem> = {}): CalorieItem {
  return { id: crypto.randomUUID(), amountKcal: 1900, ...overrides }
}

describe('MacroTrendChart', () => {
  it('renders nothing when no entry has any macro logged', () => {
    const entries = [
      entry('2026-03-01', {
        calorieEntries: [
          { id: 'c1', items: [item()], createdAt: '2026-01-01T00:00:00.000Z' },
        ],
      }),
    ]
    const { container } = render(<MacroTrendChart entries={entries} />, {
      wrapper: MemoryRouter,
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the title and all three legends when at least one macro is logged on enough days', () => {
    const entries = [
      entry('2026-03-01', {
        calorieEntries: [
          {
            id: 'c1',
            items: [item({ proteinG: 90 })],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
      entry('2026-03-02', {
        calorieEntries: [
          {
            id: 'c2',
            items: [item({ proteinG: 80 })],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
      entry('2026-03-03', {
        calorieEntries: [
          {
            id: 'c3',
            items: [item({ proteinG: 85 })],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    ]
    render(<MacroTrendChart entries={entries} />, { wrapper: MemoryRouter })

    expect(
      screen.getByRole('heading', { name: 'Protein, fat & carbs' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Protein')).toBeInTheDocument()
    expect(screen.getByText('Fat')).toBeInTheDocument()
    expect(screen.getByText('Carbs')).toBeInTheDocument()
  })

  it('includes a day that logged only one of the three macros', () => {
    const entries = [
      entry('2026-03-01', {
        calorieEntries: [
          {
            id: 'c1',
            items: [item({ carbsG: 200 })],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
      entry('2026-03-02', {
        calorieEntries: [
          {
            id: 'c2',
            items: [item({ amountKcal: 1800 })],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    ]
    // Just confirms it renders without throwing when macro coverage across
    // days is uneven (some days have none at all).
    const { container } = render(<MacroTrendChart entries={entries} />, {
      wrapper: MemoryRouter,
    })
    expect(container).not.toBeEmptyDOMElement()
  })

  describe('not-enough-data gate (#217)', () => {
    it('shows the title with a message instead of the chart with only 1-2 days logged', () => {
      const entries = [
        entry('2026-03-01', {
          calorieEntries: [
            {
              id: 'c1',
              items: [item({ proteinG: 90 })],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      ]
      render(<MacroTrendChart entries={entries} />, { wrapper: MemoryRouter })

      expect(
        screen.getByRole('heading', { name: 'Protein, fat & carbs' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'Not enough data yet to show a trend — log a few more days and check back.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText('Protein')).not.toBeInTheDocument()
    })
  })

  describe('whole-chart show/hide toggle (#245)', () => {
    afterEach(() => {
      useDashboardChartVisibilityStore.setState({
        visible: { weight: true, calories: true, macros: true },
      })
    })

    it('hides the chart body but keeps the title and toggle visible', async () => {
      const entries = [
        entry('2026-03-01', {
          calorieEntries: [
            {
              id: 'c1',
              items: [item({ proteinG: 90 })],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
        entry('2026-03-02', {
          calorieEntries: [
            {
              id: 'c2',
              items: [item({ proteinG: 80 })],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
        entry('2026-03-03', {
          calorieEntries: [
            {
              id: 'c3',
              items: [item({ proteinG: 85 })],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      ]
      const user = userEvent.setup()
      render(<MacroTrendChart entries={entries} />, { wrapper: MemoryRouter })

      const hideButton = screen.getByRole('button', {
        name: 'Hide Protein, fat & carbs',
      })
      await user.click(hideButton)

      expect(screen.queryByText('Protein')).not.toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: 'Protein, fat & carbs' }),
      ).toBeInTheDocument()
      const showButton = screen.getByRole('button', {
        name: 'Show Protein, fat & carbs',
      })
      expect(showButton).toBeInTheDocument()

      await user.click(showButton)
      expect(screen.getByText('Protein')).toBeInTheDocument()
    })
  })
})
