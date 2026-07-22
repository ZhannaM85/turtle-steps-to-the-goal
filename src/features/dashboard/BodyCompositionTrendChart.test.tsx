import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { useDashboardChartVisibilityStore, useTrackedFieldsStore } from '@/stores'
import { BodyCompositionTrendChart } from './BodyCompositionTrendChart'

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

const threeDaysOfData: DailyEntry[] = [
  entry('2026-03-01', {
    muscleMassKg: 30,
    visceralFatRating: 5,
    bodyWaterPercent: 48,
    boneMassKg: 2.3,
    bodyFatPercent: 22,
  }),
  entry('2026-03-02', { muscleMassKg: 30.2 }),
  entry('2026-03-03', { muscleMassKg: 30.4 }),
]

describe('BodyCompositionTrendChart', () => {
  afterEach(() => {
    useTrackedFieldsStore.setState((state) => ({
      tracked: { ...state.tracked, bodyComposition: true },
    }))
  })

  it('renders nothing when no entry has any of the 5 fields logged', () => {
    const entries = [entry('2026-03-01', { weightKg: 80 })]
    const { container } = render(
      <BodyCompositionTrendChart entries={entries} />,
      { wrapper: MemoryRouter },
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when body composition tracking is turned off', () => {
    useTrackedFieldsStore.setState((state) => ({
      tracked: { ...state.tracked, bodyComposition: false },
    }))
    const { container } = render(
      <BodyCompositionTrendChart entries={threeDaysOfData} />,
      { wrapper: MemoryRouter },
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the title and all 5 legends once enough days are logged', () => {
    render(<BodyCompositionTrendChart entries={threeDaysOfData} />, {
      wrapper: MemoryRouter,
    })

    expect(
      screen.getByRole('heading', { name: 'Body composition' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Muscle mass')).toBeInTheDocument()
    expect(screen.getByText('Visceral fat')).toBeInTheDocument()
    expect(screen.getByText('Body water')).toBeInTheDocument()
    expect(screen.getByText('Bone mass')).toBeInTheDocument()
    expect(screen.getByText('Body fat')).toBeInTheDocument()
  })

  describe('not-enough-data gate', () => {
    it('shows the title with a message instead of the chart with only 1-2 days logged', () => {
      const entries = [entry('2026-03-01', { muscleMassKg: 30 })]
      render(<BodyCompositionTrendChart entries={entries} />, {
        wrapper: MemoryRouter,
      })

      expect(
        screen.getByRole('heading', { name: 'Body composition' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'Not enough data yet to show a trend — log a few more days and check back.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText('Muscle mass')).not.toBeInTheDocument()
    })
  })

  describe('whole-chart show/hide toggle', () => {
    afterEach(() => {
      useDashboardChartVisibilityStore.setState((state) => ({
        visible: { ...state.visible, bodyComposition: true },
      }))
    })

    it('hides the chart body but keeps the title and toggle visible', async () => {
      const user = userEvent.setup()
      render(<BodyCompositionTrendChart entries={threeDaysOfData} />, {
        wrapper: MemoryRouter,
      })

      await user.click(
        screen.getByRole('button', { name: 'Hide Body composition' }),
      )

      expect(screen.queryByText('Muscle mass')).not.toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: 'Body composition' }),
      ).toBeInTheDocument()
      const showButton = screen.getByRole('button', {
        name: 'Show Body composition',
      })
      expect(showButton).toBeInTheDocument()

      await user.click(showButton)
      expect(screen.getByText('Muscle mass')).toBeInTheDocument()
    })
  })
})
