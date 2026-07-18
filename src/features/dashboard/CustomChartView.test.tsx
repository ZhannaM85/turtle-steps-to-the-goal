import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { useCycleTrackingStore, useDigestionTrackingStore } from '@/stores'
import { CustomChartView } from './CustomChartView'

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

describe('CustomChartView', () => {
  it('renders nothing with no entries at all', () => {
    const { container } = render(<CustomChartView entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the title and a checkbox for every numeric series', () => {
    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    expect(screen.getByText('Compare your data')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weight' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Calories' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Protein' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Carbs' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Steps' })).toBeInTheDocument()
  })

  it('defaults to Weight and Calories selected, shown in the legend', () => {
    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    expect(screen.getByRole('button', { name: 'Weight' })).toHaveAttribute(
      'data-state',
      'on',
    )
    expect(screen.getByRole('button', { name: 'Calories' })).toHaveAttribute(
      'data-state',
      'on',
    )
    expect(screen.getByRole('button', { name: 'Steps' })).toHaveAttribute(
      'data-state',
      'off',
    )
  })

  it('shows a pick-at-least-one message once every series is deselected', async () => {
    const user = userEvent.setup()
    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    await user.click(screen.getByRole('button', { name: 'Weight' }))
    await user.click(screen.getByRole('button', { name: 'Calories' }))

    expect(
      screen.getByText('Pick at least one to compare.'),
    ).toBeInTheDocument()
  })

  it('hides period/bowel-movement checkboxes when their tracking is disabled', () => {
    useCycleTrackingStore.setState({ enabled: false })
    useDigestionTrackingStore.setState({ enabled: false })
    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    expect(
      screen.queryByRole('button', { name: 'On period' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Constipation' }),
    ).not.toBeInTheDocument()
  })

  it('shows the period checkbox once cycle tracking is enabled', () => {
    useCycleTrackingStore.setState({ enabled: true })
    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    expect(
      screen.getByRole('button', { name: 'On period' }),
    ).toBeInTheDocument()

    useCycleTrackingStore.setState({ enabled: false })
  })

  it('defaults each selected series to the line chart type', () => {
    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    const weightTypes = screen.getByRole('radiogroup', {
      name: 'Chart type for Weight',
    })
    expect(within(weightTypes).getByRole('radio', { name: 'Line' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(within(weightTypes).getByRole('radio', { name: 'Bar' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('switches a series to the bar chart type when clicked, independently of other series', async () => {
    const user = userEvent.setup()
    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    const weightTypes = screen.getByRole('radiogroup', {
      name: 'Chart type for Weight',
    })
    const caloriesTypes = screen.getByRole('radiogroup', {
      name: 'Chart type for Calories',
    })

    await user.click(within(weightTypes).getByRole('radio', { name: 'Bar' }))

    expect(within(weightTypes).getByRole('radio', { name: 'Bar' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(
      within(caloriesTypes).getByRole('radio', { name: 'Line' }),
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('does not show a chart type picker for period/bowel-movement markers', async () => {
    const user = userEvent.setup()
    useCycleTrackingStore.setState({ enabled: true })
    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    await user.click(screen.getByRole('button', { name: 'On period' }))

    expect(
      screen.queryByRole('radiogroup', { name: 'Chart type for On period' }),
    ).not.toBeInTheDocument()

    useCycleTrackingStore.setState({ enabled: false })
  })
})
