import { addDays, format } from 'date-fns'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type {
  CustomCorrelation,
  CustomMetric,
  CustomMetricEntry,
} from '@/domain/customMetric'
import type { DailyEntry } from '@/domain/dailyEntry'
import { useOutlierExclusionStore } from '@/stores'
import { CustomCorrelationView } from './CustomCorrelationView'

const DATE_FORMAT = 'yyyy-MM-dd'
const DAY_0 = '2026-03-01'

function day(offset: number): string {
  return format(addDays(new Date(`${DAY_0}T00:00:00.000Z`), offset), DATE_FORMAT)
}

let idCounter = 0
function entry(date: string, weightKg: number): DailyEntry {
  idCounter += 1
  const now = '2026-01-01T00:00:00.000Z'
  return { id: `entry-${idCounter}`, date, weightKg, createdAt: now, updatedAt: now }
}

function metricEntry(date: string, value: number): CustomMetricEntry {
  idCounter += 1
  return {
    id: `metric-entry-${idCounter}`,
    metricId: 'metric-1',
    date,
    value,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

const metric: CustomMetric = {
  id: 'metric-1',
  name: 'Push-ups',
  inputKind: 'number',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const correlation: CustomCorrelation = {
  id: 'correlation-1',
  metricA: { kind: 'custom', metricId: 'metric-1' },
  metricB: { kind: 'builtin', key: 'weight' },
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('CustomCorrelationView', () => {
  it('renders nothing with no comparable days at all', () => {
    const { container } = render(
      <CustomCorrelationView
        correlation={correlation}
        entries={[]}
        metrics={[metric]}
        metricEntries={[]}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the not-enough-data caveat with fewer than 8 comparable days', () => {
    const entries = [entry(day(0), 80)]
    const metricEntries = [metricEntry(day(0), 10)]
    render(
      <CustomCorrelationView
        correlation={correlation}
        entries={entries}
        metrics={[metric]}
        metricEntries={metricEntries}
      />,
    )

    expect(
      screen.getByText(/Not enough data yet to see a pattern/),
    ).toBeInTheDocument()
  })

  it('shows the plain-language summary once there is enough data', () => {
    const entries = [
      entry(day(0), 70),
      entry(day(1), 70),
      entry(day(2), 70),
      entry(day(3), 70),
      entry(day(4), 80),
      entry(day(5), 80),
      entry(day(6), 80),
      entry(day(7), 80),
    ]
    const metricEntries = [
      metricEntry(day(0), 0),
      metricEntry(day(1), 0),
      metricEntry(day(2), 0),
      metricEntry(day(3), 0),
      metricEntry(day(4), 10),
      metricEntry(day(5), 10),
      metricEntry(day(6), 10),
      metricEntry(day(7), 10),
    ]
    render(
      <CustomCorrelationView
        correlation={correlation}
        entries={entries}
        metrics={[metric]}
        metricEntries={metricEntries}
      />,
    )

    expect(screen.getByText('Push-ups vs. Weight')).toBeInTheDocument()
    expect(
      screen.getByText(/averaged a higher "Weight" than days with lower "Push-ups"/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Based on 8 days of data\./)).toBeInTheDocument()
  })

  it('falls back to a composed "A vs. B" title when no name was given', () => {
    const entries = [entry(day(0), 80)]
    const metricEntries = [metricEntry(day(0), 10)]
    render(
      <CustomCorrelationView
        correlation={{ ...correlation, name: undefined }}
        entries={entries}
        metrics={[metric]}
        metricEntries={metricEntries}
      />,
    )

    expect(screen.getByText('Push-ups vs. Weight')).toBeInTheDocument()
  })

  it('uses a given name instead of the composed one', () => {
    const entries = [entry(day(0), 80)]
    const metricEntries = [metricEntry(day(0), 10)]
    render(
      <CustomCorrelationView
        correlation={{ ...correlation, name: 'My custom pattern' }}
        entries={entries}
        metrics={[metric]}
        metricEntries={metricEntries}
      />,
    )

    expect(screen.getByText('My custom pattern')).toBeInTheDocument()
  })

  describe('outlier detection and exclusion (#224 mechanism, reused as-is)', () => {
    afterEach(() => {
      useOutlierExclusionStore.setState({ excluded: {} })
    })

    function entriesAndMetricEntriesWithOneOutlier() {
      const entries = [
        entry(day(0), 70),
        entry(day(1), 70),
        entry(day(2), 70),
        entry(day(3), 70),
        entry(day(4), 80),
        entry(day(5), 80),
        entry(day(6), 80),
        entry(day(7), 80),
        entry(day(8), 999), // a wild B-axis outlier
      ]
      const metricEntries = [
        metricEntry(day(0), 0),
        metricEntry(day(1), 0),
        metricEntry(day(2), 0),
        metricEntry(day(3), 0),
        metricEntry(day(4), 10),
        metricEntry(day(5), 10),
        metricEntry(day(6), 10),
        metricEntry(day(7), 10),
        metricEntry(day(8), 10),
      ]
      return { entries, metricEntries }
    }

    it('excludes the flagged day from the summary once tapped', async () => {
      const user = userEvent.setup()
      const { entries, metricEntries } = entriesAndMetricEntriesWithOneOutlier()
      render(
        <CustomCorrelationView
          correlation={correlation}
          entries={entries}
          metrics={[metric]}
          metricEntries={metricEntries}
        />,
      )

      expect(screen.getByText(/Based on 9 days of data\./)).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Exclude 9 Mar 2026 from this pattern' }),
      )

      expect(screen.getByText(/Based on 8 days of data\./)).toBeInTheDocument()
    })
  })
})
