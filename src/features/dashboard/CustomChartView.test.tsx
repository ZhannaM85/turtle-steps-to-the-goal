import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { useLocaleStore } from '@/i18n'
import {
  useCustomChartSelectionStore,
  useCustomMetricStore,
  useCycleTrackingStore,
  useDashboardChartVisibilityStore,
  useDigestionTrackingStore,
  useProfileStore,
  useTrackedFieldsStore,
} from '@/stores'
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

// #195: the selection is now persisted (zustand `persist` + localStorage)
// rather than local useState, so it survives across tests in this file
// unless reset — several tests below deliberately change it.
beforeEach(() => {
  useCustomChartSelectionStore.setState({
    selectedNumeric: ['weight', 'calories'],
    selectedBoolean: [],
    selectedCustomMetricIds: [],
    chartTypes: {
      weight: 'line',
      calories: 'line',
      protein: 'line',
      fat: 'line',
      carbs: 'line',
      water: 'line',
      steps: 'line',
      waist: 'line',
      hip: 'line',
      bodyFat: 'line',
      fastingHours: 'line',
    },
  })
  useTrackedFieldsStore.setState({
    tracked: {
      sleep: true,
      steps: true,
      bodyMeasurements: true,
      note: true,
      mood: true,
      bodyComposition: true,
    },
  })
  useCustomMetricStore.setState({ metrics: [], entries: [] })
})

describe('CustomChartView', () => {
  it('renders nothing with no entries at all', () => {
    const { container } = render(<CustomChartView entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the title and a checkbox for every numeric series', () => {
    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    expect(screen.getByText('Compare your data')).toBeInTheDocument()
    // #451 — each series' unit now lives on its own toggle button, moved
    // off the Y-axis ticks (Steps has no unit, same as before).
    expect(screen.getByRole('button', { name: 'Weight (kg)' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Calories (kcal)' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Protein (g)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fat (g)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Carbs (g)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Water (ml)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Steps' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Waist (cm)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hip (cm)' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Body fat (%)' }),
    ).toBeInTheDocument()
  })

  it('defaults to Weight and Calories selected, shown in the legend', () => {
    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    expect(
      screen.getByRole('button', { name: 'Weight (kg)' }),
    ).toHaveAttribute('data-state', 'on')
    expect(
      screen.getByRole('button', { name: 'Calories (kcal)' }),
    ).toHaveAttribute('data-state', 'on')
    expect(screen.getByRole('button', { name: 'Steps' })).toHaveAttribute(
      'data-state',
      'off',
    )
  })

  it('shows a pick-at-least-one message once every series is deselected', async () => {
    const user = userEvent.setup()
    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    await user.click(screen.getByRole('button', { name: 'Weight (kg)' }))
    await user.click(screen.getByRole('button', { name: 'Calories (kcal)' }))

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

  // #351 — reported live: waist/hip stayed offered here even with "Body
  // measurements" tracking disabled in Settings, unlike the boolean
  // period/constipation series above.
  it('hides waist/hip when Body measurements tracking is disabled, keeping Body fat (gated separately)', () => {
    useTrackedFieldsStore.setState((state) => ({
      tracked: { ...state.tracked, bodyMeasurements: false },
    }))
    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    expect(
      screen.queryByRole('button', { name: 'Waist (cm)' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Hip (cm)' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Body fat (%)' }),
    ).toBeInTheDocument()
  })

  it('hides Body fat when Body composition tracking is disabled, keeping waist/hip (gated separately)', () => {
    useTrackedFieldsStore.setState((state) => ({
      tracked: { ...state.tracked, bodyComposition: false },
    }))
    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    expect(
      screen.queryByRole('button', { name: 'Body fat (%)' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Waist (cm)' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hip (cm)' })).toBeInTheDocument()
  })

  it('shows the period checkbox once cycle tracking is enabled', () => {
    useCycleTrackingStore.setState({ enabled: true })
    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    expect(
      screen.getByRole('button', { name: 'On period' }),
    ).toBeInTheDocument()

    useCycleTrackingStore.setState({ enabled: false })
  })

  it('always shows the night-eating checkbox, with no Settings opt-in to gate behind (#383)', () => {
    useCycleTrackingStore.setState({ enabled: false })
    useDigestionTrackingStore.setState({ enabled: false })
    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    expect(
      screen.getByRole('button', { name: 'Ate late tonight' }),
    ).toBeInTheDocument()
  })

  it('adds a legend entry once the night-eating series is selected', async () => {
    const user = userEvent.setup()
    render(
      <CustomChartView
        entries={[
          entry('2026-03-01', { weightKg: 80, nightEatingOverride: true }),
          entry('2026-03-02', { weightKg: 80.2 }),
        ]}
      />,
    )

    const toggle = screen.getByRole('button', { name: 'Ate late tonight' })
    // Only the filter chip itself before selection — no legend entry yet.
    expect(screen.getAllByText('Ate late tonight')).toHaveLength(1)

    await user.click(toggle)

    // Chip plus its own new legend entry, once selected.
    expect(screen.getAllByText('Ate late tonight')).toHaveLength(2)
  })

  it('uses the real profile sex for the night-eating label instead of the neutral placeholder (#407)', () => {
    useLocaleStore.setState({ locale: 'ru' })
    useProfileStore.setState({ sex: 'female' })

    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    expect(
      screen.getByRole('button', { name: 'Ела поздно вечером' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Ел(а) поздно вечером' }),
    ).not.toBeInTheDocument()

    useLocaleStore.setState({ locale: 'en' })
    useProfileStore.setState({ sex: undefined })
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

  it('remembers the series selection and chart type across a remount (#195)', async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />,
    )

    await user.click(screen.getByRole('button', { name: 'Calories (kcal)' })) // deselect
    await user.click(screen.getByRole('button', { name: 'Steps' })) // select
    const weightTypes = screen.getByRole('radiogroup', {
      name: 'Chart type for Weight',
    })
    await user.click(within(weightTypes).getByRole('radio', { name: 'Bar' }))
    unmount()

    // Simulates navigating away from Dashboard and back — a fresh mount,
    // not just a re-render of the same instance.
    render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

    expect(screen.getByRole('button', { name: 'Calories (kcal)' })).toHaveAttribute(
      'data-state',
      'off',
    )
    expect(screen.getByRole('button', { name: 'Steps' })).toHaveAttribute(
      'data-state',
      'on',
    )
    const weightTypesAfter = screen.getByRole('radiogroup', {
      name: 'Chart type for Weight',
    })
    expect(
      within(weightTypesAfter).getByRole('radio', { name: 'Bar' }),
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

  // #502 — reported live: over a multi-year range the per-day period dots
  // overlapped into one solid red band that read as continuous menstruation.
  describe('grouped boolean day markers (#502)', () => {
    function isoDate(dayOffset: number): string {
      const date = new Date(Date.UTC(2026, 0, 1))
      date.setUTCDate(date.getUTCDate() + dayOffset)
      return date.toISOString().slice(0, 10)
    }

    /** Daily weight entries with a 5-day period every 28 days. */
    function cycleEntries(days: number): DailyEntry[] {
      return Array.from({ length: days }, (_, day) =>
        entry(isoDate(day), {
          weightKg: 80,
          onPeriod: day % 28 < 5 || undefined,
        }),
      )
    }

    afterEach(() => {
      useCycleTrackingStore.setState({ enabled: false })
    })

    it('explains the grouping when the range is long enough to need it', () => {
      useCycleTrackingStore.setState({ enabled: true })
      useCustomChartSelectionStore.setState({ selectedBoolean: ['onPeriod'] })

      render(<CustomChartView entries={cycleEntries(120)} />)

      expect(
        screen.getByText(/one dot can stand for several marked days/),
      ).toBeInTheDocument()
    })

    it('keeps a dot per day, and no grouping notice, on a short range', () => {
      useCycleTrackingStore.setState({ enabled: true })
      useCustomChartSelectionStore.setState({ selectedBoolean: ['onPeriod'] })

      render(<CustomChartView entries={cycleEntries(10)} />)

      expect(
        screen.queryByText(/one dot can stand for several marked days/),
      ).not.toBeInTheDocument()
    })

    it('says nothing about grouping when no marker series is selected', () => {
      render(<CustomChartView entries={cycleEntries(120)} />)

      expect(
        screen.queryByText(/one dot can stand for several marked days/),
      ).not.toBeInTheDocument()
    })
  })

  describe('dual y-axis for exactly 2 series (#330)', () => {
    it('hides the normalized-scale caveat when exactly 2 series are selected', () => {
      // beforeEach's default selection is already ['weight', 'calories'].
      render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

      expect(
        screen.queryByText(/Each line is scaled to its own range/),
      ).not.toBeInTheDocument()
    })

    it('hides the normalized-scale caveat with only 1 series selected (#393)', async () => {
      const user = userEvent.setup()
      render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

      await user.click(screen.getByRole('button', { name: 'Calories (kcal)' })) // down to 1

      expect(
        screen.queryByText(/Each line is scaled to its own range/),
      ).not.toBeInTheDocument()
    })

    it('shows the normalized-scale caveat again when a custom metric joins a single selected series (#393)', () => {
      useCustomMetricStore.setState({
        metrics: [
          {
            id: 'metric-1',
            name: 'Acne',
            inputKind: 'scale5',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        entries: [],
      })
      useCustomChartSelectionStore.setState({
        selectedNumeric: ['weight'],
        selectedCustomMetricIds: ['metric-1'],
      })
      render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

      expect(
        screen.getByText(/Each line is scaled to its own range/),
      ).toBeInTheDocument()
    })

    it('still shows the normalized-scale caveat once a 3rd series is added', async () => {
      const user = userEvent.setup()
      render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

      await user.click(screen.getByRole('button', { name: 'Protein (g)' })) // up to 3

      expect(
        screen.getByText(/Each line is scaled to its own range/),
      ).toBeInTheDocument()
    })
  })

  describe('custom metrics (#371)', () => {
    beforeEach(() => {
      useCustomMetricStore.setState({
        metrics: [
          {
            id: 'metric-1',
            name: 'Acne',
            inputKind: 'scale5',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        entries: [
          {
            id: 'entry-1',
            metricId: 'metric-1',
            date: '2026-03-01',
            value: 3,
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      })
    })

    it('offers a chip for each defined custom metric', () => {
      render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

      expect(screen.getByRole('button', { name: 'Acne' })).toBeInTheDocument()
    })

    it('adds the metric to the legend once selected', async () => {
      const user = userEvent.setup()
      render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

      await user.click(screen.getByRole('button', { name: 'Acne' }))

      // Once selected it renders twice: the picker chip, and the legend entry.
      expect(screen.getAllByText('Acne')).toHaveLength(2)
    })

    it('offers a line/bar/dots chart-type toggle for a selected custom metric, defaulting to line (#391)', async () => {
      const user = userEvent.setup()
      render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

      await user.click(screen.getByRole('button', { name: 'Acne' }))

      const acneTypes = screen.getByRole('radiogroup', {
        name: 'Chart type for Acne',
      })
      expect(within(acneTypes).getByRole('radio', { name: 'Line' })).toHaveAttribute(
        'aria-checked',
        'true',
      )

      await user.click(within(acneTypes).getByRole('radio', { name: 'Bar' }))

      expect(within(acneTypes).getByRole('radio', { name: 'Bar' })).toHaveAttribute(
        'aria-checked',
        'true',
      )
      expect(within(acneTypes).getByRole('radio', { name: 'Line' })).toHaveAttribute(
        'aria-checked',
        'false',
      )
    })

    it('does not show the empty-chart message when only a custom metric is selected', async () => {
      const user = userEvent.setup()
      render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

      await user.click(screen.getByRole('button', { name: 'Weight (kg)' })) // deselect
      await user.click(screen.getByRole('button', { name: 'Calories (kcal)' })) // deselect
      await user.click(screen.getByRole('button', { name: 'Acne' })) // select

      expect(
        screen.queryByText('Pick at least one to compare.'),
      ).not.toBeInTheDocument()
    })

    it('includes a date with only a custom-metric value, even with no DailyEntry for it', async () => {
      const user = userEvent.setup()
      // No DailyEntry at all on 2026-03-05 — only a custom metric log.
      useCustomMetricStore.setState({
        metrics: [
          {
            id: 'metric-1',
            name: 'Acne',
            inputKind: 'scale5',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        entries: [
          {
            id: 'entry-1',
            metricId: 'metric-1',
            date: '2026-03-05',
            value: 4,
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      })
      render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

      await user.click(screen.getByRole('button', { name: 'Weight (kg)' })) // deselect
      await user.click(screen.getByRole('button', { name: 'Calories (kcal)' })) // deselect
      await user.click(screen.getByRole('button', { name: 'Acne' })) // select

      // Renders without crashing and shows the chart (not the empty message)
      // even though the only logged date for the selected series has no
      // corresponding DailyEntry at all.
      expect(
        screen.queryByText('Pick at least one to compare.'),
      ).not.toBeInTheDocument()
    })

    it('keeps the normalized-scale caveat visible when a custom metric joins an active dual-axis pair', () => {
      // beforeEach's default selection is already ['weight', 'calories'] — a
      // dual-axis pair that would normally hide this caveat (#330).
      useCustomChartSelectionStore.setState({ selectedCustomMetricIds: ['metric-1'] })
      render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

      expect(
        screen.getByText(/Each line is scaled to its own range/),
      ).toBeInTheDocument()
    })
  })

  describe('whole-card show/hide toggle (#247)', () => {
    afterEach(() => {
      useDashboardChartVisibilityStore.setState((state) => ({
        visible: { ...state.visible, customChart: true },
      }))
    })

    it('hides the card body but keeps the title and toggle visible', async () => {
      const user = userEvent.setup()
      render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

      expect(screen.getByText('Compare your data')).toBeInTheDocument()
      const hideButton = screen.getByRole('button', {
        name: 'Hide Compare your data',
      })

      await user.click(hideButton)

      expect(
        screen.queryByRole('button', { name: 'Weight (kg)' }),
      ).not.toBeInTheDocument()
      expect(screen.getByText('Compare your data')).toBeInTheDocument()
      const showButton = screen.getByRole('button', {
        name: 'Show Compare your data',
      })
      expect(showButton).toBeInTheDocument()

      await user.click(showButton)
      expect(screen.getByRole('button', { name: 'Weight (kg)' })).toBeInTheDocument()
    })
  })

  describe('prev/next period paging (#453)', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows no paging arrows when no period is passed (pre-#453 behavior)', () => {
      render(<CustomChartView entries={[entry('2026-03-01', { weightKg: 80 })]} />)

      expect(
        screen.queryByRole('button', { name: 'Previous period' }),
      ).not.toBeInTheDocument()
    })

    it('goes to the previous week when the Previous period arrow is clicked', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-07-28T12:00:00.000Z'))
      const user = userEvent.setup({ delay: null })
      const entries = [
        entry('2026-07-16', { weightKg: 80 }),
        entry('2026-07-25', { weightKg: 79 }),
      ]

      render(<CustomChartView entries={entries} period="week" />)

      expect(screen.getByText('22.07.26 – 28.07.26')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Previous period' }))

      expect(screen.getByText('15.07.26 – 21.07.26')).toBeInTheDocument()
    })
  })
})
