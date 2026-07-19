import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CalorieEntry } from '@/domain/dailyEntry'
import { MealList } from './MealList'

/**
 * MealList (#145) was extracted from DailyEntryForm.tsx so it can be
 * mounted standalone (DayDetail.tsx now does exactly that). The exhaustive
 * add/edit/per-100g/drag-reorder behavior coverage already lives in
 * DailyEntryForm.test.tsx (unchanged after the extraction) — this file just
 * proves the component works on its own, independent of any parent form.
 */
describe('MealList', () => {
  it('shows the add-row even with no meals yet', () => {
    render(<MealList calorieEntries={[]} onChange={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: '+ Add item' }),
    ).toBeInTheDocument()
  })

  it('adds a meal and calls onChange with the new list', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MealList calorieEntries={[]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '+ Add item' }))
    await user.type(screen.getByLabelText('kcal/100g'), '200')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0] as CalorieEntry[]
    expect(next).toHaveLength(1)
    expect(next[0].items[0].amountKcal).toBe(200)
  })

  it('edits an existing meal and calls onChange with the update', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const calorieEntries: CalorieEntry[] = [
      {
        id: 'c1',
        items: [{ id: 'i1', amountKcal: 300 }],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    render(<MealList calorieEntries={calorieEntries} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
    await user.type(screen.getByLabelText('Meal name — Meal 1'), 'Brunch')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0] as CalorieEntry[]
    expect(next[0].label).toBe('Brunch')
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
    render(<MealList calorieEntries={calorieEntries} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onChange).toHaveBeenCalledWith([])
  })
})
