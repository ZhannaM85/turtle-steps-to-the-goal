import 'fake-indexeddb/auto'
import type { ReactNode } from 'react'
import { format } from 'date-fns'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import {
  DEFAULT_DASHBOARD_SECTION_ORDER,
  useDashboardSectionOrderStore,
  useGoalStore,
} from '@/stores'
import { DashboardScreen } from './DashboardScreen'

// #297 — same reasoning DailyEntryForm.test.tsx's own meal-reorder tests
// already documented: jsdom has no layout engine, so a real pointer/
// keyboard drag can't produce meaningful rects for dnd-kit's collision
// detection. Trust dnd-kit itself (independently tested) to turn real
// gestures into DragEndEvents, and only test this screen's own onDragEnd
// wiring by capturing and invoking it directly with a synthetic event.
let capturedOnDragEnd:
  | ((event: { active: { id: string }; over: { id: string } | null }) => void)
  | undefined

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    DndContext: (props: {
      onDragEnd: typeof capturedOnDragEnd
      children: ReactNode
    }) => {
      capturedOnDragEnd = props.onDragEnd
      return props.children
    },
  }
})

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    date: '2026-03-01',
    weightKg: 80,
    calorieEntries: [
      {
        id: crypto.randomUUID(),
        items: [{ id: crypto.randomUUID(), amountKcal: 2000 }],
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  useGoalStore.setState({ goal: null, status: 'idle', error: null })
  useDashboardSectionOrderStore.persist.clearStorage()
  useDashboardSectionOrderStore.setState({
    order: DEFAULT_DASHBOARD_SECTION_ORDER,
  })
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
})

describe('DashboardScreen', () => {
  it('shows an empty state when there are no entries yet', async () => {
    render(<DashboardScreen />, { wrapper: MemoryRouter })

    expect(await screen.findByText('No entries yet')).toBeInTheDocument()
  })

  it('renders the charts and weekly summary once enough entries exist', async () => {
    // #217: charts need >= 3 logged days before they draw a trend line
    // rather than showing a "not enough data" message.
    await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
    await db.dailyEntries.put(makeEntry({ date: '2026-03-02' }))
    await db.dailyEntries.put(makeEntry({ date: '2026-03-03' }))

    render(<DashboardScreen />, { wrapper: MemoryRouter })

    expect(await screen.findByText('Weekly summary')).toBeInTheDocument()
    expect(screen.getByText('weight')).toBeInTheDocument()
    expect(screen.getByText('calories')).toBeInTheDocument()
  })

  describe('drag-and-drop section reordering (#297)', () => {
    it('persists a new order and re-renders sections in that order', async () => {
      await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
      await db.dailyEntries.put(makeEntry({ date: '2026-03-02' }))
      await db.dailyEntries.put(makeEntry({ date: '2026-03-03' }))

      render(<DashboardScreen />, { wrapper: MemoryRouter })
      await screen.findByText('Weight trend')

      const titlesBefore = screen
        .getAllByRole('heading', { level: 2 })
        .map((el) => el.textContent)
      expect(titlesBefore.indexOf('Weight trend')).toBeLessThan(
        titlesBefore.indexOf('Calorie trend'),
      )

      // Drags "weight" to where "calories" was.
      act(() => {
        capturedOnDragEnd?.({ active: { id: 'weight' }, over: { id: 'calories' } })
      })

      expect(useDashboardSectionOrderStore.getState().order.slice(0, 2)).toEqual([
        'calories',
        'weight',
      ])
      const titlesAfter = screen
        .getAllByRole('heading', { level: 2 })
        .map((el) => el.textContent)
      expect(titlesAfter.indexOf('Calorie trend')).toBeLessThan(
        titlesAfter.indexOf('Weight trend'),
      )
    })

    it('does not reorder when a drag ends over itself or nothing', async () => {
      await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
      await db.dailyEntries.put(makeEntry({ date: '2026-03-02' }))
      await db.dailyEntries.put(makeEntry({ date: '2026-03-03' }))

      render(<DashboardScreen />, { wrapper: MemoryRouter })
      await screen.findByText('Weight trend')

      act(() => {
        capturedOnDragEnd?.({ active: { id: 'weight' }, over: { id: 'weight' } })
        capturedOnDragEnd?.({ active: { id: 'weight' }, over: null })
      })

      expect(useDashboardSectionOrderStore.getState().order).toEqual(
        DEFAULT_DASHBOARD_SECTION_ORDER,
      )
    })
  })

  it('renders the monthly summary once entries exist (#226)', async () => {
    await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
    await db.dailyEntries.put(makeEntry({ date: '2026-03-02' }))

    render(<DashboardScreen />, { wrapper: MemoryRouter })

    expect(await screen.findByText('Monthly summary')).toBeInTheDocument()
    expect(screen.getByText('March 2026')).toBeInTheDocument()
  })

  it('renders the recent-averages cards once entries exist (#215)', async () => {
    // Recent-averages is anchored to the real current date, unlike the
    // other tests here which use fixed 2026-03 dates that fall well
    // outside any real "last 30 days" window.
    await db.dailyEntries.put(makeEntry({ date: format(new Date(), 'yyyy-MM-dd') }))

    render(<DashboardScreen />, { wrapper: MemoryRouter })

    expect(await screen.findByText('Recent averages')).toBeInTheDocument()
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
  })
})
