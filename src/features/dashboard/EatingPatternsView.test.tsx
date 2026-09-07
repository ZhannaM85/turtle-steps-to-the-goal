import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { useDashboardChartVisibilityStore } from '@/stores'
import { EatingPatternsView } from './EatingPatternsView'

function meal(
  id: string,
  timeEaten: string,
  kcal: number,
  carbsG?: number,
): CalorieEntry {
  return {
    id,
    items: [
      {
        id: `${id}-i`,
        amountKcal: kcal,
        ...(carbsG !== undefined ? { carbsG } : {}),
      },
    ],
    timeEaten,
    createdAt: '2026-03-01T00:00:00.000Z',
  }
}

function entry(date: string, calorieEntries: CalorieEntry[]): DailyEntry {
  return {
    id: date,
    date,
    calorieEntries,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  }
}

describe('EatingPatternsView (#823)', () => {
  afterEach(() => {
    useDashboardChartVisibilityStore.setState((state) => ({
      visible: { ...state.visible, eatingPatterns: true },
    }))
  })

  it('shows the learning empty state when there is not enough data', () => {
    render(
      <EatingPatternsView
        entries={[entry('2026-03-01', [meal('a', '13:00', 400, 40)])]}
      />,
    )
    expect(screen.getByText('Personal eating patterns')).toBeInTheDocument()
    expect(
      screen.getByText(/still learning your patterns/i),
    ).toBeInTheDocument()
  })

  it('renders a carb-gap insight and opens calculation details', async () => {
    const user = userEvent.setup()
    const days: DailyEntry[] = []
    for (let i = 1; i <= 8; i++) {
      const day = String(i).padStart(2, '0')
      days.push(
        entry(`2026-03-${day}`, [
          meal(`hi-${i}`, '08:00', 400, 80),
          meal(`next-hi-${i}`, '10:00', 200),
        ]),
      )
    }
    for (let i = 9; i <= 16; i++) {
      const day = String(i).padStart(2, '0')
      days.push(
        entry(`2026-03-${day}`, [
          meal(`lo-${i}`, '08:00', 400, 10),
          meal(`next-lo-${i}`, '12:00', 200),
        ]),
      )
    }

    render(<EatingPatternsView entries={days} />)

    expect(
      screen.getByText(/higher-carb meals were followed/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/Based on/)).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'How this was calculated' }),
    )
    expect(
      screen.getByText(/never inferred from the gap/i),
    ).toBeInTheDocument()
  })
})
