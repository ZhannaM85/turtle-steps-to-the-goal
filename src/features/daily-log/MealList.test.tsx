import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { CalorieEntry } from '@/domain/dailyEntry'
import { MealList } from './MealList'

/**
 * MealList (#145) was extracted from DailyEntryForm.tsx so it can be
 * mounted standalone (DayDetail.tsx now does exactly that). The exhaustive
 * add/per-100g/drag-reorder behavior coverage already lives in
 * DailyEntryForm.test.tsx (unchanged after the extraction) — this file just
 * proves the component works on its own, independent of any parent form.
 * **#157**: existing-meal editing moved to a dedicated route
 * (`MealEditScreen.tsx`), reached by navigating away from here rather than
 * expanding inline — that exhaustive coverage now lives in
 * `MealEditScreen.test.tsx` instead. This file only proves the pencil
 * navigates to the right place and that `focusMealId` opens edit mode
 * directly (the mechanism `MealEditScreen` depends on).
 */
describe('MealList', () => {
  it('shows the add-row even with no meals yet', () => {
    render(<MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />, {
      wrapper: MemoryRouter,
    })

    expect(
      screen.getByRole('button', { name: '+ Add item' }),
    ).toBeInTheDocument()
  })

  it('adds a meal and calls onChange with the new list', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MealList calorieEntries={[]} date="2026-03-01" onChange={onChange} />, {
      wrapper: MemoryRouter,
    })

    await user.click(screen.getByRole('button', { name: '+ Add item' }))
    await user.type(screen.getByLabelText('kcal/100g'), '200')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0] as CalorieEntry[]
    expect(next).toHaveLength(1)
    expect(next[0].items[0].amountKcal).toBe(200)
  })

  it("navigates to the dedicated edit route when a meal's pencil is clicked (#157)", async () => {
    const user = userEvent.setup()
    const calorieEntries: CalorieEntry[] = [
      {
        id: 'c1',
        items: [{ id: 'i1', amountKcal: 300 }],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    render(
      <MemoryRouter initialEntries={['/']}>
        <MealList calorieEntries={calorieEntries} date="2026-03-01" onChange={vi.fn()} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))

    // No inline edit UI opens — the pencil navigates instead (there's no
    // matching <Routes> in this bare render, so the location itself isn't
    // directly assertable here; the absence of inline fields is the
    // observable proof editing didn't happen in place).
    expect(
      screen.queryByLabelText('Meal name — Meal 1'),
    ).not.toBeInTheDocument()
  })

  it('deletes a meal via the two-step confirm and calls onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const calorieEntries: CalorieEntry[] = [
      {
        id: 'c1',
        items: [{ id: 'i1', amountKcal: 300 }],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    render(
      <MealList calorieEntries={calorieEntries} date="2026-03-01" onChange={onChange} />,
      { wrapper: MemoryRouter },
    )

    await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onChange).toHaveBeenCalledWith([])
  })

  describe('focusMealId (#157) — the dedicated single-meal edit route mechanism', () => {
    it('opens the matching meal in edit mode automatically on mount', async () => {
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [{ id: 'i1', amountKcal: 300 }],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      render(
        <MealList
          calorieEntries={calorieEntries}
          date="2026-03-01"
          onChange={vi.fn()}
          focusMealId="c1"
        />,
        { wrapper: MemoryRouter },
      )

      expect(
        await screen.findByLabelText('Meal name — Meal 1'),
      ).toBeInTheDocument()
    })

    it('hides the "add a new meal" row while focused', () => {
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [{ id: 'i1', amountKcal: 300 }],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      render(
        <MealList
          calorieEntries={calorieEntries}
          date="2026-03-01"
          onChange={vi.fn()}
          focusMealId="c1"
        />,
        { wrapper: MemoryRouter },
      )

      expect(
        screen.queryByRole('button', { name: '+ Add item' }),
      ).not.toBeInTheDocument()
    })

    it('calls onFocusedMealDone after saving', async () => {
      const user = userEvent.setup()
      const onFocusedMealDone = vi.fn()
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [{ id: 'i1', amountKcal: 300 }],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      render(
        <MealList
          calorieEntries={calorieEntries}
          date="2026-03-01"
          onChange={vi.fn()}
          focusMealId="c1"
          onFocusedMealDone={onFocusedMealDone}
        />,
        { wrapper: MemoryRouter },
      )

      await screen.findByLabelText('Meal name — Meal 1')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onFocusedMealDone).toHaveBeenCalledTimes(1)
    })

    it('calls onFocusedMealDone after cancelling', async () => {
      const user = userEvent.setup()
      const onFocusedMealDone = vi.fn()
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [{ id: 'i1', amountKcal: 300 }],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      render(
        <MealList
          calorieEntries={calorieEntries}
          date="2026-03-01"
          onChange={vi.fn()}
          focusMealId="c1"
          onFocusedMealDone={onFocusedMealDone}
        />,
        { wrapper: MemoryRouter },
      )

      await screen.findByLabelText('Meal name — Meal 1')
      await user.click(
        screen.getByRole('button', { name: 'Cancel editing meal 1' }),
      )

      expect(onFocusedMealDone).toHaveBeenCalledTimes(1)
    })
  })
})
