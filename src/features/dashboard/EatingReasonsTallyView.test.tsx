import { format } from 'date-fns'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import {
  useDashboardChartVisibilityStore,
  useEatingReasonTrackingStore,
} from '@/stores'
import { EatingReasonsTallyView } from './EatingReasonsTallyView'

let idCounter = 0

function item(): CalorieItem {
  idCounter += 1
  return { id: `item-${idCounter}`, name: 'Tea', amountKcal: 10 }
}

function entry(date: string, eatingReason: string): DailyEntry {
  idCounter += 1
  const now = `${date}T00:00:00.000Z`
  return {
    id: `entry-${idCounter}`,
    date,
    calorieEntries: [
      {
        id: `meal-${idCounter}`,
        items: [item()],
        createdAt: now,
        eatingReason,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }
}

describe('EatingReasonsTallyView (#814)', () => {
  beforeEach(() => {
    useEatingReasonTrackingStore.setState({ enabled: true })
  })

  afterEach(() => {
    useEatingReasonTrackingStore.setState({ enabled: false })
    useDashboardChartVisibilityStore.setState((state) => ({
      visible: { ...state.visible, eatingReasonsTally: true },
    }))
  })

  it('renders nothing when eating-reason tracking is off', () => {
    useEatingReasonTrackingStore.setState({ enabled: false })
    const { container } = render(
      <EatingReasonsTallyView
        entries={[entry(format(new Date(), 'yyyy-MM-dd'), 'hunger')]}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lists reasons from the last 7 days', () => {
    render(
      <EatingReasonsTallyView
        entries={[
          entry(format(new Date(), 'yyyy-MM-dd'), 'hunger'),
          entry(format(new Date(), 'yyyy-MM-dd'), 'habit'),
        ]}
      />,
    )
    expect(screen.getByText('Why meals happened recently')).toBeInTheDocument()
    expect(screen.getAllByText('Hunger').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Habit').length).toBeGreaterThan(0)
  })
})
