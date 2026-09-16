import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useProfileStore } from '@/stores'
import {
  CompleteDayProjectionDialog,
  CompleteDayWeekTick,
} from './CompleteDayProjectionDialog'
import { DailyEntryFormStateProvider } from './DailyEntryFormStateContext'
import { calories, now } from './dailyEntryFormTestUtils'

describe('CompleteDayProjectionDialog (#934 / #936 / #938 / #944)', () => {
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

    await user.click(
      screen.getByRole('button', { name: 'Complete the day' }),
    )
    expect(
      screen.getByRole('heading', {
        name: 'If days like today became your usual pattern…',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText("Today's intake")).toBeInTheDocument()
    expect(screen.getByText('≈ 58.8 kg')).toBeInTheDocument()
    expect(screen.getByText('Estimated maintenance')).toBeInTheDocument()
    expect(screen.getByText('Estimated daily deficit')).toBeInTheDocument()
    expect(screen.getByText(/About .+ lower over 5 weeks/)).toBeInTheDocument()
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

    await user.click(
      screen.getByRole('button', { name: 'Complete the day' }),
    )
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

    await user.click(
      screen.getByRole('button', { name: 'Complete the day' }),
    )
    expect(
      screen.getByText(/isn't a good day to project from/),
    ).toBeInTheDocument()
    expect(screen.queryByText("Today's intake")).not.toBeInTheDocument()
  })

  it('anchors Today at the start and 5 weeks at the end (#938)', () => {
    const { container } = render(
      <svg>
        <CompleteDayWeekTick
          x={10}
          y={20}
          payload={{ value: 0 }}
          todayLabel="Today"
          endLabel="5 weeks"
        />
        <CompleteDayWeekTick
          x={200}
          y={20}
          payload={{ value: 5 }}
          todayLabel="Today"
          endLabel="5 weeks"
        />
        <CompleteDayWeekTick
          x={100}
          y={20}
          payload={{ value: 2 }}
          todayLabel="Today"
          endLabel="5 weeks"
        />
      </svg>,
    )
    const labels = container.querySelectorAll('text')
    expect(labels).toHaveLength(2)
    expect(labels[0]).toHaveAttribute('text-anchor', 'start')
    expect(labels[0]).toHaveTextContent('Today')
    expect(labels[1]).toHaveAttribute('text-anchor', 'end')
    expect(labels[1]).toHaveTextContent('5 weeks')
  })
})
