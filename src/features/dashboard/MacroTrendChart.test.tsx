import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import {
  MACRO_SERIES_KEYS,
  useDashboardChartVisibilityStore,
  useMacroChartSelectionStore,
} from '@/stores'
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

function dayWith(date: string, overrides: Partial<CalorieItem> = {}): DailyEntry {
  return entry(date, {
    calorieEntries: [
      {
        id: `c-${date}`,
        items: [item(overrides)],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  })
}

const threeDaysOfProtein: DailyEntry[] = [
  dayWith('2026-03-01', { proteinG: 90 }),
  dayWith('2026-03-02', { proteinG: 80 }),
  dayWith('2026-03-03', { proteinG: 85 }),
]

// #501 — the picker/chart-type selection is persisted (zustand `persist` +
// localStorage), so it survives across tests in this file unless reset.
beforeEach(() => {
  useMacroChartSelectionStore.setState({
    selected: [...MACRO_SERIES_KEYS],
    chartTypes: { protein: 'line', fat: 'line', carbs: 'line', calories: 'line' },
  })
})

describe('MacroTrendChart', () => {
  it('renders nothing when no entry has any macro or calories logged', () => {
    const entries = [entry('2026-03-01', { weightKg: 80 })]
    const { container } = render(<MacroTrendChart entries={entries} />, {
      wrapper: MemoryRouter,
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the title, a chip per series, and a legend entry for each selected series', () => {
    render(<MacroTrendChart entries={threeDaysOfProtein} />, {
      wrapper: MemoryRouter,
    })

    expect(
      screen.getByRole('heading', { name: 'Protein, fat & carbs' }),
    ).toBeInTheDocument()
    for (const chip of ['Protein (g)', 'Fat (g)', 'Carbs (g)', 'Calories (kcal)']) {
      expect(screen.getByRole('button', { name: chip })).toHaveAttribute(
        'data-state',
        'on',
      )
    }
    expect(screen.getByText('Protein')).toBeInTheDocument()
    expect(screen.getByText('Fat')).toBeInTheDocument()
    expect(screen.getByText('Carbs')).toBeInTheDocument()
    expect(screen.getByText('Calories')).toBeInTheDocument()
  })

  it('counts a day that logged calories but no macros at all (#501)', () => {
    const entries = [
      dayWith('2026-03-01'),
      dayWith('2026-03-02'),
      dayWith('2026-03-03'),
    ]
    render(<MacroTrendChart entries={entries} />, { wrapper: MemoryRouter })

    expect(screen.getByText('Calories')).toBeInTheDocument()
    expect(
      screen.queryByText(
        'Not enough data yet to show a trend — log a few more days and check back.',
      ),
    ).not.toBeInTheDocument()
  })

  describe('not-enough-data gate (#217)', () => {
    it('shows the title with a message instead of the chart with only 1-2 days logged', () => {
      render(<MacroTrendChart entries={[dayWith('2026-03-01', { proteinG: 90 })]} />, {
        wrapper: MemoryRouter,
      })

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
      // Merges onto whatever keys exist rather than a full literal
      // (#232) — see CalorieTrendChart.test.tsx's identical comment.
      useDashboardChartVisibilityStore.setState((state) => ({
        visible: { ...state.visible, macros: true },
      }))
    })

    it('hides the chart body but keeps the title and toggle visible', async () => {
      const user = userEvent.setup()
      render(<MacroTrendChart entries={threeDaysOfProtein} />, {
        wrapper: MemoryRouter,
      })

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

  describe('series picker (#501)', () => {
    it('drops a series from the legend once its chip is unchecked', async () => {
      const user = userEvent.setup()
      render(<MacroTrendChart entries={threeDaysOfProtein} />, {
        wrapper: MemoryRouter,
      })

      await user.click(screen.getByRole('button', { name: 'Fat (g)' }))

      // The chip itself stays put (now off) — only the legend entry goes.
      expect(screen.queryByText('Fat')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Fat (g)' })).toHaveAttribute(
        'data-state',
        'off',
      )
      expect(screen.getByText('Protein')).toBeInTheDocument()
    })

    it('shows a "pick at least one" message once every chip is unchecked', async () => {
      const user = userEvent.setup()
      render(<MacroTrendChart entries={threeDaysOfProtein} />, {
        wrapper: MemoryRouter,
      })

      for (const chip of [
        'Protein (g)',
        'Fat (g)',
        'Carbs (g)',
        'Calories (kcal)',
      ]) {
        await user.click(screen.getByRole('button', { name: chip }))
      }

      expect(
        screen.getByText('Pick at least one series to show.'),
      ).toBeInTheDocument()
      // The chips stay visible so the user can re-select.
      expect(
        screen.getByRole('button', { name: 'Protein (g)' }),
      ).toBeInTheDocument()
    })

    it('persists the selection across a remount', async () => {
      const user = userEvent.setup()
      const { unmount } = render(<MacroTrendChart entries={threeDaysOfProtein} />, {
        wrapper: MemoryRouter,
      })

      await user.click(screen.getByRole('button', { name: 'Carbs (g)' }))
      unmount()

      render(<MacroTrendChart entries={threeDaysOfProtein} />, {
        wrapper: MemoryRouter,
      })
      expect(screen.getByRole('button', { name: 'Carbs (g)' })).toHaveAttribute(
        'data-state',
        'off',
      )
    })
  })

  describe('conditional y-axis by selection count (#501)', () => {
    it('shows the normalized-scale caveat with all four series selected', () => {
      render(<MacroTrendChart entries={threeDaysOfProtein} />, {
        wrapper: MemoryRouter,
      })

      expect(
        screen.getByText(/Each line is scaled to its own range/),
      ).toBeInTheDocument()
    })

    it('drops the caveat at exactly 2 series, where real axes take over', async () => {
      const user = userEvent.setup()
      render(<MacroTrendChart entries={threeDaysOfProtein} />, {
        wrapper: MemoryRouter,
      })

      await user.click(screen.getByRole('button', { name: 'Carbs (g)' }))
      await user.click(screen.getByRole('button', { name: 'Calories (kcal)' }))

      expect(
        screen.queryByText(/Each line is scaled to its own range/),
      ).not.toBeInTheDocument()
    })

    it('drops the caveat at exactly 1 series too', async () => {
      const user = userEvent.setup()
      render(<MacroTrendChart entries={threeDaysOfProtein} />, {
        wrapper: MemoryRouter,
      })

      for (const chip of ['Fat (g)', 'Carbs (g)', 'Calories (kcal)']) {
        await user.click(screen.getByRole('button', { name: chip }))
      }

      expect(
        screen.queryByText(/Each line is scaled to its own range/),
      ).not.toBeInTheDocument()
    })
  })

  describe('per-series chart type (#501)', () => {
    it('defaults every selected series to the line type', () => {
      render(<MacroTrendChart entries={threeDaysOfProtein} />, {
        wrapper: MemoryRouter,
      })

      const proteinTypes = screen.getByRole('radiogroup', {
        name: 'Chart type for Protein',
      })
      expect(
        within(proteinTypes).getByRole('radio', { name: 'Line' }),
      ).toHaveAttribute('aria-checked', 'true')
    })

    it('switches one series to bars without touching the others', async () => {
      const user = userEvent.setup()
      render(<MacroTrendChart entries={threeDaysOfProtein} />, {
        wrapper: MemoryRouter,
      })

      const proteinTypes = screen.getByRole('radiogroup', {
        name: 'Chart type for Protein',
      })
      const caloriesTypes = screen.getByRole('radiogroup', {
        name: 'Chart type for Calories',
      })
      await user.click(within(proteinTypes).getByRole('radio', { name: 'Bar' }))

      expect(
        within(proteinTypes).getByRole('radio', { name: 'Bar' }),
      ).toHaveAttribute('aria-checked', 'true')
      expect(
        within(caloriesTypes).getByRole('radio', { name: 'Line' }),
      ).toHaveAttribute('aria-checked', 'true')
    })
  })
})
