import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import {
  completeDayAxisTickLabel,
  completeDayChartEndAxisLabel,
  completeDayHorizonWeeks,
  completeDayProjectionEndIso,
  completeDayWeekGridTicks,
} from '@/domain/stats'
import { formatLocalizedDate, formatLocalizedShortDate } from '@/i18n'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useProfileStore } from '@/stores'
import {
  COMPLETE_DAY_PROJECTION_CHART_CLASS,
  COMPLETE_DAY_PROJECTION_ESTIMATE_ROW_CLASS,
  COMPLETE_DAY_PROJECTION_ESTIMATE_VALUE_CLASS,
  COMPLETE_DAY_PROJECTION_SHEET_CLASS,
  CompleteDayProjectionDialog,
  CompleteDayWeekTick,
} from './CompleteDayProjectionDialog'
import { DailyEntryFormStateProvider } from './DailyEntryFormStateContext'
import { calories, now } from './dailyEntryFormTestUtils'

function renderProjectionDialog() {
  return render(
    <MemoryRouter>
      <DailyEntryFormStateProvider
        date="2026-03-01"
        existingEntry={{
          id: 'e1',
          date: '2026-03-01',
          weightKg: 60.2,
          calorieEntries: [calories(1200, 'm1')],
          createdAt: now,
          updatedAt: now,
        }}
        onSave={vi.fn()}
      >
        <CompleteDayProjectionDialog />
      </DailyEntryFormStateProvider>
    </MemoryRouter>,
  )
}

describe('CompleteDayProjectionDialog (#934 / #936 / #938 / #944 / #945 / #947 / #948 / #949 / #953 / #954 / #955)', () => {
  beforeEach(() => {
    useProfileStore.setState({
      heightCm: 165,
      age: 41,
      sex: 'female',
      activityLevel: 'sedentary',
    })
  })

  afterEach(async () => {
    await db.dailyEntries.clear()
    useProfileStore.setState({
      heightCm: undefined,
      age: undefined,
      sex: undefined,
      activityLevel: undefined,
    })
  })

  it('uses outline chrome like Start today’s log now (#944)', () => {
    render(
      <MemoryRouter>
        <DailyEntryFormStateProvider
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            weightKg: 60.2,
            calorieEntries: [calories(1200, 'm1')],
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        >
          <CompleteDayProjectionDialog />
        </DailyEntryFormStateProvider>
      </MemoryRouter>,
    )

    const completeDay = screen.getByRole('button', {
      name: 'Complete the day',
    })
    expect(completeDay).toHaveAttribute('data-variant', 'outline')
    expect(completeDay).toHaveClass('border-border', 'bg-background')
  })

  it('opens a closable overlay with a 5-week estimate', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <DailyEntryFormStateProvider
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            weightKg: 60.2,
            calorieEntries: [calories(1200, 'm1')],
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        >
          <CompleteDayProjectionDialog />
        </DailyEntryFormStateProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Complete the day' }))
    expect(
      screen.getByRole('heading', {
        name: 'If days like today became your usual pattern…',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText("Today's intake")).toBeInTheDocument()
    expect(screen.getByText('Estimated maintenance')).toBeInTheDocument()
    expect(screen.getByText('Estimated daily deficit')).toBeInTheDocument()
    expect(screen.getByText(/About .+ lower over 1 week/)).toBeInTheDocument()
    expect(screen.getByText('weight')).toBeInTheDocument()
    expect(screen.getByText('7-day average')).toBeInTheDocument()
    expect(
      screen.getAllByText(/Daily scale weight will fluctuate/).length,
    ).toBeGreaterThan(0)
    expect(
      screen.queryByRole('link', { name: 'Open Settings' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(
      screen.queryByRole('heading', {
        name: 'If days like today became your usual pattern…',
      }),
    ).not.toBeInTheDocument()
  })

  it('explains when weight is missing', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <DailyEntryFormStateProvider
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            calorieEntries: [calories(1200, 'm1')],
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        >
          <CompleteDayProjectionDialog />
        </DailyEntryFormStateProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Complete the day' }))
    expect(screen.getByText(/weight first/)).toBeInTheDocument()
  })

  it('does not project from an unusually low calorie day', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <DailyEntryFormStateProvider
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            weightKg: 60.2,
            calorieEntries: [calories(600, 'm1')],
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        >
          <CompleteDayProjectionDialog />
        </DailyEntryFormStateProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Complete the day' }))
    expect(
      screen.getByText(/isn't a good day to project from/),
    ).toBeInTheDocument()
    expect(screen.queryByText("Today's intake")).not.toBeInTheDocument()
  })

  it('anchors short dates at the start and end of the grid (#938 / #953)', () => {
    const formatTick = (week: number) =>
      completeDayAxisTickLabel(week, '2026-03-01', (iso) =>
        formatLocalizedShortDate(iso, 'en'),
      )
    const { container } = render(
      <svg>
        <CompleteDayWeekTick
          x={10}
          y={20}
          payload={{ value: 0 }}
          formatTick={formatTick}
          endWeek={1}
        />
        <CompleteDayWeekTick
          x={200}
          y={20}
          payload={{ value: 1 }}
          formatTick={formatTick}
          endWeek={1}
        />
        <CompleteDayWeekTick
          x={100}
          y={20}
          payload={{ value: 0.5 }}
          formatTick={formatTick}
          endWeek={1}
        />
      </svg>,
    )
    const labels = container.querySelectorAll('text')
    expect(labels).toHaveLength(3)
    expect(labels[0]).toHaveAttribute('text-anchor', 'start')
    expect(labels[0]).toHaveTextContent('03/01/2026')
    expect(labels[1]).toHaveAttribute('text-anchor', 'end')
    expect(labels[1]).toHaveTextContent('03/08/2026')
    expect(labels[2]).toHaveAttribute('text-anchor', 'middle')
    expect(labels[2]).toHaveTextContent('03/05/2026')
    expect(labels[2]?.textContent).not.toMatch(/^\d+$/)
  })

  it('labels interior X ticks as dates, not day numbers (#953)', () => {
    const formatTick = (week: number) =>
      completeDayAxisTickLabel(week, '2026-03-01', (iso) =>
        formatLocalizedShortDate(iso, 'en'),
      )
    const { container } = render(
      <svg>
        <CompleteDayWeekTick
          x={80}
          y={20}
          payload={{ value: 3 / 7 }}
          formatTick={formatTick}
          endWeek={1}
        />
      </svg>,
    )
    const label = container.querySelector('text')
    expect(label).toHaveAttribute('text-anchor', 'middle')
    expect(label).toHaveTextContent('03/04/2026')
    expect(label?.textContent).not.toMatch(/^\d+$/)
  })

  it('puts a date under every Month grid line and nowhere else (#953)', () => {
    const formatTick = (week: number) =>
      completeDayAxisTickLabel(week, '2026-03-01', (iso) =>
        formatLocalizedShortDate(iso, 'en'),
      )
    const ticks = completeDayWeekGridTicks('month')
    const { container } = render(
      <svg>
        {ticks.map((week) => (
          <CompleteDayWeekTick
            key={week}
            x={week * 40}
            y={20}
            payload={{ value: week }}
            formatTick={formatTick}
            endWeek={completeDayHorizonWeeks('month')}
          />
        ))}
      </svg>,
    )
    const labels = [...container.querySelectorAll('text')].map(
      (node) => node.textContent,
    )
    expect(labels).toEqual([
      '03/01/2026',
      '03/08/2026',
      '03/15/2026',
      '03/22/2026',
      '03/29/2026',
      '03/31/2026',
    ])
    expect(labels).toHaveLength(ticks.length)
    for (const label of labels) {
      expect(label).not.toMatch(/^\d+$/)
    }
  })

  it('puts the calendar end date only in the week-end axis label (#945 / #947 / #948)', () => {
    const endLabel = completeDayChartEndAxisLabel(
      formatLocalizedDate(completeDayProjectionEndIso('2026-03-01'), 'en'),
    )
    const formatTick = (week: number) =>
      completeDayAxisTickLabel(week, '2026-03-01', (iso) =>
        formatLocalizedShortDate(iso, 'en'),
      )
    const { container } = render(
      <svg>
        <CompleteDayWeekTick
          x={200}
          y={20}
          payload={{ value: 1 }}
          formatTick={formatTick}
          endWeek={1}
        />
      </svg>,
    )
    expect(endLabel).toBe('Mar 8, 2026')
    expect(endLabel).not.toMatch(/1 week/)
    expect(container.querySelector('text')).toHaveTextContent('03/08/2026')
    expect(container.querySelector('text')).not.toHaveTextContent('Today')
  })

  it('shows oscillating dual-series legend line samples and keeps the end date (#947)', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <DailyEntryFormStateProvider
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            weightKg: 60.2,
            calorieEntries: [calories(1200, 'm1')],
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        >
          <CompleteDayProjectionDialog />
        </DailyEntryFormStateProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Complete the day' }))
    expect(screen.getByText('weight')).toBeInTheDocument()
    expect(screen.getByText('7-day average')).toBeInTheDocument()
    expect(screen.getByText(/About .+ lower over 1 week/)).toBeInTheDocument()
    expect(screen.queryByText(/5 weeks ·/)).not.toBeInTheDocument()

    const weightLine = document.querySelector(
      '[data-legend-series="weight"] line',
    )
    const averageLine = document.querySelector(
      '[data-legend-series="average"] line',
    )
    expect(weightLine).toHaveAttribute('stroke-width', '2.5')
    expect(weightLine).not.toHaveAttribute('stroke-dasharray')
    expect(averageLine).toHaveAttribute('stroke-width', '1.5')
    expect(averageLine).toHaveAttribute('stroke-dasharray', '4 3')
    expect(document.querySelector('.size-2.rounded-sm')).not.toBeInTheDocument()
  })

  it('defaults to the Week tab (#948)', async () => {
    const user = userEvent.setup()
    renderProjectionDialog()
    await user.click(screen.getByRole('button', { name: 'Complete the day' }))
    const tabs = screen.getByLabelText('Projection period')
    expect(within(tabs).getByRole('radio', { name: 'Week' })).toHaveAttribute(
      'data-state',
      'on',
    )
    expect(within(tabs).getByRole('radio', { name: 'Month' })).toHaveAttribute(
      'data-state',
      'off',
    )
    expect(within(tabs).getByRole('radio', { name: 'Year' })).toHaveAttribute(
      'data-state',
      'off',
    )
    expect(screen.getByText(/About .+ lower over 1 week/)).toBeInTheDocument()
    expect(
      screen.queryByText(/About .+ lower over 1 month/),
    ).not.toBeInTheDocument()
  })

  it('recalculates estimate, footer, and end date when switching Month and Year (#948)', async () => {
    const user = userEvent.setup()
    renderProjectionDialog()
    await user.click(screen.getByRole('button', { name: 'Complete the day' }))
    const tabs = screen.getByLabelText('Projection period')
    const weekEstimate = screen.getByText(/^≈ /).textContent
    expect(screen.getByText(/About .+ lower over 1 week/)).toBeInTheDocument()

    await user.click(within(tabs).getByRole('radio', { name: 'Month' }))
    expect(within(tabs).getByRole('radio', { name: 'Month' })).toHaveAttribute(
      'data-state',
      'on',
    )
    expect(screen.getByText(/About .+ lower over 1 month/)).toBeInTheDocument()
    expect(
      screen.queryByText(/About .+ lower over 1 week/),
    ).not.toBeInTheDocument()
    const monthEstimate = screen.getByText(/^≈ /).textContent
    expect(monthEstimate).not.toBe(weekEstimate)

    await user.click(within(tabs).getByRole('radio', { name: 'Year' }))
    expect(within(tabs).getByRole('radio', { name: 'Year' })).toHaveAttribute(
      'data-state',
      'on',
    )
    expect(screen.getByText(/About .+ lower over 1 year/)).toBeInTheDocument()
    expect(
      screen.queryByText(/About .+ lower over 1 month/),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/^≈ /).textContent).not.toBe(monthEstimate)
    expect(screen.getByText('weight')).toBeInTheDocument()
    expect(screen.getByText('7-day average')).toBeInTheDocument()
  })

  it('keeps oscillating legend, date-only end, and start/end ticks after axis ticks (#949 / #953 / #954)', async () => {
    const user = userEvent.setup()
    renderProjectionDialog()
    await user.click(screen.getByRole('button', { name: 'Complete the day' }))
    expect(screen.getByText('weight')).toBeInTheDocument()
    expect(screen.getByText('7-day average')).toBeInTheDocument()
    expect(
      document.querySelector('[data-legend-series="weight"] line'),
    ).not.toHaveAttribute('stroke-dasharray')
    expect(
      document.querySelector('[data-legend-series="average"] line'),
    ).toHaveAttribute('stroke-dasharray', '4 3')
    expect(screen.getByText(/About .+ lower over 1 week/)).toBeInTheDocument()
    const tabs = screen.getByLabelText('Projection period')
    await user.click(within(tabs).getByRole('radio', { name: 'Year' }))
    expect(screen.getByText(/About .+ lower over 1 year/)).toBeInTheDocument()
    expect(screen.getByText('weight')).toBeInTheDocument()
    expect(screen.getByText('7-day average')).toBeInTheDocument()
  })

  it('keeps compact layout tokens that leave the chart readable (#955)', () => {
    expect(COMPLETE_DAY_PROJECTION_SHEET_CLASS).toContain('gap-3')
    expect(COMPLETE_DAY_PROJECTION_SHEET_CLASS).not.toContain('gap-6')
    expect(COMPLETE_DAY_PROJECTION_CHART_CLASS).toContain('h-56')
    expect(COMPLETE_DAY_PROJECTION_ESTIMATE_ROW_CLASS).toContain('flex')
    expect(COMPLETE_DAY_PROJECTION_ESTIMATE_ROW_CLASS).toContain(
      'justify-between',
    )
    expect(COMPLETE_DAY_PROJECTION_ESTIMATE_VALUE_CLASS).toContain('text-xl')
    expect(COMPLETE_DAY_PROJECTION_ESTIMATE_VALUE_CLASS).not.toContain(
      'text-3xl',
    )
  })

  it('places the estimate beside the legend, above the kcal card (#955)', async () => {
    const user = userEvent.setup()
    renderProjectionDialog()
    await user.click(screen.getByRole('button', { name: 'Complete the day' }))

    const sheet = document.querySelector('[data-complete-day-sheet]')
    const chart = document.querySelector('[data-complete-day-chart]')
    const row = document.querySelector('[data-complete-day-estimate-row]')
    const estimate = screen.getByText(/^≈ /)
    const intake = screen.getByText("Today's intake")

    expect(sheet).toHaveClass('mt-3', 'gap-3')
    expect(sheet).not.toHaveClass('gap-6')
    expect(chart).toHaveClass('h-56')
    expect(row).toHaveClass('flex', 'items-end', 'justify-between')
    expect(row).toContainElement(screen.getByText('weight'))
    expect(row).toContainElement(screen.getByText('7-day average'))
    expect(row).toContainElement(estimate)
    expect(estimate).toHaveClass('text-xl')
    expect(estimate).not.toHaveClass('text-3xl')
    expect(
      chart!.compareDocumentPosition(row!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(
      row!.compareDocumentPosition(intake) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)

    const tabs = screen.getByLabelText('Projection period')
    await user.click(within(tabs).getByRole('radio', { name: 'Year' }))
    expect(screen.getByText(/^≈ /)).toBeInTheDocument()
    expect(screen.getByText(/About .+ lower over 1 year/)).toBeInTheDocument()
    expect(screen.getByText("Today's intake")).toBeInTheDocument()
    expect(
      screen.getAllByText(/Daily scale weight will fluctuate/).length,
    ).toBeGreaterThan(0)
  })
})
