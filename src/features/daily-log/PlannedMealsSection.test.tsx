import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalorieEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { usePlannedMealStore, useTodaySectionsCollapseStore } from '@/stores'
import { PlannedMealsSection } from './PlannedMealsSection'

beforeEach(async () => {
  await db.plannedMeals.clear()
  usePlannedMealStore.setState({
    plannedMeals: [],
    status: 'idle',
    error: null,
  })
  // In-memory state survives across tests even after localStorage.clear()
  // (same class of leak the #622 note-dismissal store hit) — reset the
  // collapse flag explicitly so one test's "Hide planned meals" click
  // doesn't leave the section collapsed for the next test.
  useTodaySectionsCollapseStore.setState((state) => ({
    sections: { ...state.sections, plannedMeals: false },
  }))
  localStorage.clear()
})

afterEach(async () => {
  await db.plannedMeals.clear()
  localStorage.clear()
})

function renderSection(
  date: string,
  calorieEntries: CalorieEntry[] = [],
  onChange = vi.fn(),
) {
  render(
    <PlannedMealsSection
      date={date}
      calorieEntries={calorieEntries}
      onChange={onChange}
    />,
  )
  return { onChange }
}

describe('PlannedMealsSection (#614)', () => {
  it('stages a new draft for the day after the one currently open, without touching calorieEntries', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSection('2026-08-05')

    await user.click(
      screen.getByRole('button', { name: '+ Plan a meal for tomorrow' }),
    )
    await user.type(
      screen.getByLabelText('What are you planning?'),
      'Chicken and rice',
    )
    await user.type(screen.getByLabelText('Calories (optional)'), '450')
    await user.click(screen.getByRole('button', { name: 'Save plan' }))

    expect(onChange).not.toHaveBeenCalled()
    const stored = await db.plannedMeals.toArray()
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({
      date: '2026-08-06',
      name: 'Chicken and rice',
      amountKcal: 450,
    })
  })

  it('shows drafts staged for the day currently open, and promotes one into calorieEntries', async () => {
    await db.plannedMeals.put({
      id: 'plan-1',
      date: '2026-08-06',
      name: 'Chicken and rice',
      amountKcal: 450,
      createdAt: '2026-08-05T20:00:00.000Z',
    })
    const user = userEvent.setup()
    const { onChange } = renderSection('2026-08-06')

    expect(await screen.findByText('Chicken and rice')).toBeInTheDocument()
    expect(screen.getByText('· 450 kcal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add to log' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    const [next] = onChange.mock.calls[0] as [CalorieEntry[]]
    expect(next).toHaveLength(1)
    expect(next[0].items[0]).toMatchObject({
      name: 'Chicken and rice',
      amountKcal: 450,
    })
    // Promoting removes the draft so it isn't offered again.
    expect(await db.plannedMeals.toArray()).toEqual([])
  })

  it('does not show a draft staged for a different date', async () => {
    await db.plannedMeals.put({
      id: 'plan-1',
      date: '2026-08-06',
      name: 'Chicken and rice',
      createdAt: '2026-08-05T20:00:00.000Z',
    })
    renderSection('2026-08-05')

    expect(
      await screen.findByRole('button', { name: '+ Plan a meal for tomorrow' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Chicken and rice')).not.toBeInTheDocument()
  })

  it('discards a staged draft without promoting it', async () => {
    await db.plannedMeals.put({
      id: 'plan-1',
      date: '2026-08-06',
      name: 'Chicken and rice',
      createdAt: '2026-08-05T20:00:00.000Z',
    })
    const user = userEvent.setup()
    const { onChange } = renderSection('2026-08-06')

    await user.click(
      await screen.findByRole('button', {
        name: 'Discard planned meal: Chicken and rice',
      }),
    )

    expect(onChange).not.toHaveBeenCalled()
    expect(
      screen.queryByText('Chicken and rice'),
    ).not.toBeInTheDocument()
    expect(await db.plannedMeals.toArray()).toEqual([])
  })

  it('collapses to a count summary', async () => {
    await db.plannedMeals.put({
      id: 'plan-1',
      date: '2026-08-06',
      name: 'Chicken and rice',
      createdAt: '2026-08-05T20:00:00.000Z',
    })
    const user = userEvent.setup()
    renderSection('2026-08-06')

    await screen.findByText('Chicken and rice')
    await user.click(
      screen.getByRole('button', { name: 'Hide planned meals' }),
    )

    expect(screen.getByText('1 planned')).toBeInTheDocument()
    expect(screen.queryByText('Chicken and rice')).not.toBeInTheDocument()
  })
})
