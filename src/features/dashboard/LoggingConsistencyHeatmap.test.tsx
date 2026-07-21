import { format } from 'date-fns'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { useDashboardChartVisibilityStore } from '@/stores'
import { LoggingConsistencyHeatmap } from './LoggingConsistencyHeatmap'

function today(): string {
  return format(new Date(), 'yyyy-MM-dd')
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

describe('LoggingConsistencyHeatmap', () => {
  it('renders nothing when there are no entries', () => {
    const { container } = render(<LoggingConsistencyHeatmap entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the title and a legend once there is at least one entry', () => {
    const entries = [entry(today(), { weightKg: 80 })]
    render(<LoggingConsistencyHeatmap entries={entries} />)

    expect(screen.getByText('Logging consistency')).toBeInTheDocument()
    expect(screen.getByText('Less')).toBeInTheDocument()
    expect(screen.getByText('More')).toBeInTheDocument()
  })

  it('gives a fully-logged day a title reflecting its full score', () => {
    const entries = [
      entry(today(), {
        weightKg: 80,
        calorieEntries: [
          {
            id: 'c1',
            items: [{ id: 'i1', amountKcal: 500 }],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        sleepHours: 7,
        steps: 5000,
      }),
    ]
    render(<LoggingConsistencyHeatmap entries={entries} />)

    expect(screen.getByTitle(/: 4\/4$/)).toBeInTheDocument()
  })

  describe('whole-card show/hide toggle (#232)', () => {
    afterEach(() => {
      useDashboardChartVisibilityStore.setState((state) => ({
        visible: { ...state.visible, loggingConsistency: true },
      }))
    })

    it('hides the card body but keeps the title and toggle visible', async () => {
      const user = userEvent.setup()
      const entries = [entry(today(), { weightKg: 80 })]
      render(<LoggingConsistencyHeatmap entries={entries} />)

      const title = 'Logging consistency'
      expect(screen.getByText(title)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: `Hide ${title}` }))

      expect(screen.queryByText('Less')).not.toBeInTheDocument()
      expect(screen.getByText(title)).toBeInTheDocument()
      const showButton = screen.getByRole('button', { name: `Show ${title}` })
      expect(showButton).toBeInTheDocument()

      await user.click(showButton)
      expect(screen.getByText('Less')).toBeInTheDocument()
    })
  })
})
