import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { useLocaleStore } from '@/i18n'
import { useUnitStore } from '@/stores/unitStore'
import { AverageWeightCard } from './AverageWeightCard'

function entry(date: string, weightKg?: number): DailyEntry {
  return {
    id: date,
    date,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    weightKg,
  }
}

const entries = [
  entry('2026-01-01', 90),
  entry('2026-03-01', 84),
  entry('2026-03-02', 80),
  entry('2026-03-08', 82),
]

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
  useUnitStore.setState({ unit: 'kg' })
})

describe('AverageWeightCard (#1126)', () => {
  it('shows week, month, and year as numbers', () => {
    render(<AverageWeightCard date="2026-03-08" entries={entries} />)

    expect(screen.getByText('Week')).toBeInTheDocument()
    expect(screen.getByText('81.0')).toBeInTheDocument()
    expect(screen.getByText('Month')).toBeInTheDocument()
    expect(screen.getByText('82.0')).toBeInTheDocument()
    expect(screen.getByText('Year')).toBeInTheDocument()
    expect(screen.getByText('84.0')).toBeInTheDocument()
  })

  it('hides a window with fewer than two weigh-ins, and the card when none qualify', () => {
    render(
      <AverageWeightCard
        date="2026-03-08"
        entries={[entry('2026-03-08', 82)]}
      />,
    )
    expect(screen.queryByText('Week')).not.toBeInTheDocument()
    expect(screen.queryByText('Month')).not.toBeInTheDocument()
    expect(screen.queryByText('Year')).not.toBeInTheDocument()
  })
})
