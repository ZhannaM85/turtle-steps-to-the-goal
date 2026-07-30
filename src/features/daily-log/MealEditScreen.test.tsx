import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useMealItemStore } from '@/stores'
import { MealEditScreen } from './MealEditScreen'

// #459 — MealEditScreen was migrated off MealList's own single-meal-focus
// mode onto AddMealDialog directly, so it now shares that component's own
// interaction model: one item edited at a time via MealItemEditorSheet
// (not several inline rows editable at once), no custom meal-label field,
// and every change persists immediately (no separate "Save" step for the
// meal group itself). This file replaces the old MealList-era coverage
// (simultaneous multi-row editing, label renaming) with tests matching
// that new model — see #459's own priority-tracker note for why those old
// capabilities were dropped rather than preserved.
vi.setConfig({ testTimeout: 15000 })

const now = '2026-03-01T00:00:00.000Z'

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  return {
    id: 'e1',
    date: '2026-03-01',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

async function renderMealEditScreen(mealId = 'c1', date = '2026-03-01') {
  const utils = render(
    <MemoryRouter initialEntries={[`/entry/${date}/meal/${mealId}`]}>
      <Routes>
        <Route path="/entry/:date/meal/:mealId" element={<MealEditScreen />} />
      </Routes>
    </MemoryRouter>,
  )
  // Data loads asynchronously (repository getByDate) — wait for the meal's
  // own AddMealDialog to be showing before interacting. Every existing
  // meal has at least one item (CalorieEntry.items is never empty), so
  // "This meal so far" is always present once loaded.
  await screen.findByText('This meal so far')
  return utils
}

beforeEach(async () => {
  await db.dailyEntries.clear()
  await db.mealItems.clear()
  useMealItemStore.setState({ items: [], status: 'idle', error: null })
})

afterEach(async () => {
  await db.dailyEntries.clear()
  await db.mealItems.clear()
})

describe('MealEditScreen', () => {
  it("shows the meal's own items and title, at its real position (#187)", async () => {
    const oneItemMeal: CalorieEntry = {
      id: 'c3',
      items: [{ id: 'i1', name: 'Salmon', amountKcal: 300 }],
      createdAt: now,
    }
    await db.dailyEntries.put(
      makeEntry({
        calorieEntries: [
          { id: 'c1', items: [{ id: 'i0', amountKcal: 100 }], createdAt: now },
          { id: 'c2', items: [{ id: 'i0b', amountKcal: 100 }], createdAt: now },
          oneItemMeal,
        ],
      }),
    )
    await renderMealEditScreen('c3')

    // c3 is the 3rd meal of the day — its title should reflect position 3
    // ("Dinner"), not fall back to position 1 just because it's the only
    // meal AddMealDialog itself knows about.
    expect(screen.getByText('Dinner')).toBeInTheDocument()
    expect(screen.getByText('Salmon')).toBeInTheDocument()
    expect(screen.getByText(/300/)).toBeInTheDocument()
  })

  it('shows the not-found message for a stale mealId', async () => {
    await db.dailyEntries.put(
      makeEntry({
        calorieEntries: [
          { id: 'c1', items: [{ id: 'i1', amountKcal: 100 }], createdAt: now },
        ],
      }),
    )
    render(
      <MemoryRouter initialEntries={['/entry/2026-03-01/meal/does-not-exist']}>
        <Routes>
          <Route path="/entry/:date/meal/:mealId" element={<MealEditScreen />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByText("This meal couldn't be found."),
    ).toBeInTheDocument()
  })

  it('adds a new item via the "Add food" quick action, persisting it immediately', async () => {
    const user = userEvent.setup()
    await db.dailyEntries.put(
      makeEntry({
        calorieEntries: [
          { id: 'c1', items: [{ id: 'i1', name: 'Salmon', amountKcal: 300 }], createdAt: now },
        ],
      }),
    )
    await renderMealEditScreen()

    await user.click(screen.getByRole('button', { name: 'Add food' }))
    await user.type(screen.getByLabelText('Dish name'), 'Bread')
    await user.type(screen.getByLabelText('kcal/100g'), '80')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Bread')).toBeInTheDocument()
    await waitFor(async () => {
      const saved = await db.dailyEntries.get('e1')
      expect(saved?.calorieEntries?.[0].items.map((item) => item.name)).toEqual([
        'Salmon',
        'Bread',
      ])
    })
  })

  it('edits an already-added item in place by tapping its row', async () => {
    const user = userEvent.setup()
    await db.dailyEntries.put(
      makeEntry({
        calorieEntries: [
          {
            id: 'c1',
            items: [{ id: 'i1', name: 'Salmon', amountKcal: 300, amountG: 150 }],
            createdAt: now,
          },
        ],
      }),
    )
    await renderMealEditScreen()

    await user.click(screen.getByText('Salmon'))
    expect(screen.getByRole('heading', { name: 'Edit item' })).toBeInTheDocument()
    const nameField = screen.getByLabelText('Dish name')
    expect(nameField).toHaveValue('Salmon')
    // Edit-in-place prefills 'perPortion' mode (the direct passthrough
    // representation — see startEditItem's own comment), whose amount
    // field is labeled "kcal" (the item's real total), not "kcal/100g".
    await user.clear(screen.getByLabelText('kcal'))
    await user.type(screen.getByLabelText('kcal'), '450')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(async () => {
      const saved = await db.dailyEntries.get('e1')
      const items = saved?.calorieEntries?.[0].items
      expect(items).toHaveLength(1)
      expect(items?.[0]).toMatchObject({
        id: 'i1',
        name: 'Salmon',
        amountKcal: 450,
        amountG: 150,
      })
    })
  })

  it('removes one item of several, persisting the remaining item', async () => {
    const user = userEvent.setup()
    await db.dailyEntries.put(
      makeEntry({
        calorieEntries: [
          {
            id: 'c1',
            items: [
              { id: 'i1', name: 'Salmon', amountKcal: 300 },
              { id: 'i2', name: 'Rice', amountKcal: 200 },
            ],
            createdAt: now,
          },
        ],
      }),
    )
    await renderMealEditScreen()

    await user.click(screen.getAllByRole('button', { name: 'Delete item' })[0])

    await waitFor(async () => {
      const saved = await db.dailyEntries.get('e1')
      expect(saved?.calorieEntries?.[0].items.map((item) => item.id)).toEqual([
        'i2',
      ])
    })
  })

  it("removing a meal's last item deletes the whole meal", async () => {
    const user = userEvent.setup()
    await db.dailyEntries.put(
      makeEntry({
        calorieEntries: [
          { id: 'c1', items: [{ id: 'i1', name: 'Salmon', amountKcal: 300 }], createdAt: now },
          { id: 'c2', items: [{ id: 'i2', amountKcal: 100 }], createdAt: now },
        ],
      }),
    )
    await renderMealEditScreen()

    await user.click(screen.getByRole('button', { name: 'Delete item' }))

    await waitFor(async () => {
      const saved = await db.dailyEntries.get('e1')
      expect(saved?.calorieEntries?.map((meal) => meal.id)).toEqual(['c2'])
    })
  })

  it('deletes the whole meal via the header delete button after confirming', async () => {
    const user = userEvent.setup()
    await db.dailyEntries.put(
      makeEntry({
        calorieEntries: [
          { id: 'c1', items: [{ id: 'i1', name: 'Salmon', amountKcal: 300 }], createdAt: now },
          { id: 'c2', items: [{ id: 'i2', amountKcal: 100 }], createdAt: now },
        ],
      }),
    )
    await renderMealEditScreen()

    await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(async () => {
      const saved = await db.dailyEntries.get('e1')
      expect(saved?.calorieEntries?.map((meal) => meal.id)).toEqual(['c2'])
    })
  })

  it('cancels a whole-meal delete without removing it', async () => {
    const user = userEvent.setup()
    await db.dailyEntries.put(
      makeEntry({
        calorieEntries: [
          { id: 'c1', items: [{ id: 'i1', name: 'Salmon', amountKcal: 300 }], createdAt: now },
        ],
      }),
    )
    await renderMealEditScreen()

    await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText('Salmon')).toBeInTheDocument()
    expect(await db.dailyEntries.get('e1')).toMatchObject({
      calorieEntries: [{ id: 'c1' }],
    })
  })

  it('edits time eaten and the meal note, persisting each immediately', async () => {
    const user = userEvent.setup()
    await db.dailyEntries.put(
      makeEntry({
        calorieEntries: [
          { id: 'c1', items: [{ id: 'i1', name: 'Salmon', amountKcal: 300 }], createdAt: now },
        ],
      }),
    )
    await renderMealEditScreen()

    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '08:15' } })
    await user.type(screen.getByLabelText('Meal note'), 'Ate outside')

    await waitFor(async () => {
      const saved = await db.dailyEntries.get('e1')
      expect(saved?.calorieEntries?.[0].timeEaten).toBe('08:15')
      expect(saved?.calorieEntries?.[0].note).toBe('Ate outside')
    })
  })

  it("edits the meal's reaction, persisting it immediately", async () => {
    const user = userEvent.setup()
    await db.dailyEntries.put(
      makeEntry({
        calorieEntries: [
          { id: 'c1', items: [{ id: 'i1', name: 'Salmon', amountKcal: 300 }], createdAt: now },
        ],
      }),
    )
    await renderMealEditScreen()

    await user.click(screen.getByRole('button', { name: 'Yes — Breakfast' }))

    await waitFor(async () => {
      const saved = await db.dailyEntries.get('e1')
      expect(saved?.calorieEntries?.[0].reaction).toBe('happy')
    })
  })
})
