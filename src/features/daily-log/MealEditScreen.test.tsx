import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useMealItemStore, useMealLabelPresetStore } from '@/stores'
import { MealEditScreen } from './MealEditScreen'

/**
 * The dedicated single-meal edit route (#157) — reached by tapping a
 * meal's pencil on Today or History, replacing #145's inline
 * expand-in-place. This file carries the exhaustive itemized-meal-editing
 * coverage that used to live in DailyEntryForm.test.tsx's "itemized meal
 * editing" describe block (moved wholesale, adapted for real
 * navigation/persistence instead of props/callback mocks) — the
 * underlying editing UI/logic is unchanged from before #157, only *how
 * it's reached* moved. View-mode display tests (custom label rendering,
 * default numbering, etc.) and the "add a new meal" flow are untouched
 * by #157 and stay in DailyEntryForm.test.tsx/MealList.test.tsx.
 */

const now = '2026-03-01T00:00:00.000Z'

function calories(
  amountKcal: number,
  id: string = crypto.randomUUID(),
): CalorieEntry {
  return {
    id,
    items: [{ id: crypto.randomUUID(), amountKcal }],
    createdAt: now,
  }
}

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
  // Data loads asynchronously (repository getByDate) — wait for the
  // meal's own edit UI (already open, #157's whole point) before
  // interacting, same as waiting for any other async-loaded screen.
  await screen.findByLabelText('Meal name — Meal 1')
  return utils
}

beforeEach(async () => {
  await db.dailyEntries.clear()
  await db.mealItems.clear()
  useMealItemStore.setState({ items: [], status: 'idle', error: null })
  useMealLabelPresetStore.setState({ presets: [] })
})

afterEach(async () => {
  await db.dailyEntries.clear()
  await db.mealItems.clear()
})

describe('MealEditScreen', () => {
  it('shows the per-100g rate and quantity back-calculated from stored totals (#96)', async () => {
    const user = userEvent.setup()
    await db.dailyEntries.put(
      makeEntry({
        calorieEntries: [
          {
            id: 'c1',
            items: [
              { id: 'i1', amountKcal: 150, proteinG: 5, amountG: 50 },
            ],
            createdAt: now,
          },
        ],
      }),
    )
    await renderMealEditScreen()

    await user.click(screen.getByRole('button', { name: 'Edit item' }))
    const dialog = screen.getByRole('dialog')

    // 150 kcal / 5g protein eaten as a 50g portion back-calculates to
    // 300 kcal/100g and 10g protein/100g; 50g is 0.5 portions of 100g.
    expect(within(dialog).getByLabelText('kcal/100g')).toHaveValue('300')
    expect(within(dialog).getByLabelText('Protein')).toHaveValue('10')
    expect(within(dialog).getByLabelText('× 100g')).toHaveValue('0.5')
  })

  it('shows a live preview of an item-edit row’s computed total (#98)', async () => {
    const user = userEvent.setup()
    await db.dailyEntries.put(
      makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
    )
    await renderMealEditScreen()

    await user.click(screen.getByRole('button', { name: 'Edit item' }))
    const dialog = screen.getByRole('dialog')
    await user.clear(within(dialog).getByLabelText('× 100g'))
    await user.type(within(dialog).getByLabelText('× 100g'), '0.5')

    // Meal 1's stored item is 300 kcal with no recorded amountG, so
    // itemDraftFrom's fallback shows kcal/100g = 300; scaled by the
    // newly-typed 0.5 portions (50g, #140): 300 * 0.5 = 150.
    expect(screen.getByText('Total: 150 kcal')).toBeInTheDocument()
  })

  it('edits a meal amount in place and saves immediately', async () => {
    const user = userEvent.setup()
    await db.dailyEntries.put(
      makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
    )
    await renderMealEditScreen()

    await user.click(screen.getByRole('button', { name: 'Edit item' }))
    const dialog = screen.getByRole('dialog')
    const input = within(dialog).getByLabelText('kcal/100g')
    await user.clear(input)
    await user.type(input, '350')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(async () => {
      const saved = await db.dailyEntries.get('e1')
      const amounts = saved?.calorieEntries?.map((c) => c.items[0].amountKcal)
      expect(amounts).toEqual([350, 200])
    })
  })

  describe('custom meal name (#110)', () => {
    it('sets a custom label and saves it', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(makeEntry({ calorieEntries: [calories(300, 'c1')] }))
      await renderMealEditScreen()

      await user.type(
        screen.getByLabelText('Meal name — Meal 1'),
        'Breakfast',
      )
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(async () => {
        const saved = await db.dailyEntries.get('e1')
        expect(saved?.calorieEntries?.[0].label).toBe('Breakfast')
      })
    })

    it('saves a custom label on Enter, not just the Save button (#146)', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(makeEntry({ calorieEntries: [calories(300, 'c1')] }))
      await renderMealEditScreen()

      await user.type(
        screen.getByLabelText('Meal name — Meal 1'),
        'Breakfast{Enter}',
      )

      await waitFor(async () => {
        const saved = await db.dailyEntries.get('e1')
        expect(saved?.calorieEntries?.[0].label).toBe('Breakfast')
      })
    })

    it('prefills the label input with the existing custom label', async () => {
      await db.dailyEntries.put(
        makeEntry({
          calorieEntries: [{ ...calories(300, 'c1'), label: 'Dinner' }],
        }),
      )
      await renderMealEditScreen()

      expect(screen.getByLabelText('Meal name — Meal 1')).toHaveValue(
        'Dinner',
      )
    })

    it('clearing the label reverts to the default numbering', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(
        makeEntry({
          calorieEntries: [{ ...calories(300, 'c1'), label: 'Dinner' }],
        }),
      )
      await renderMealEditScreen()

      await user.clear(screen.getByLabelText('Meal name — Meal 1'))
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(async () => {
        const saved = await db.dailyEntries.get('e1')
        expect(saved?.calorieEntries?.[0].label).toBeUndefined()
      })
    })

    it('fills the label from a quick-pick preset', async () => {
      useMealLabelPresetStore.setState({ presets: ['Lunch'] })
      const user = userEvent.setup()
      await db.dailyEntries.put(makeEntry({ calorieEntries: [calories(300, 'c1')] }))
      await renderMealEditScreen()

      await user.click(screen.getByRole('button', { name: 'Lunch' }))

      expect(screen.getByLabelText('Meal name — Meal 1')).toHaveValue(
        'Lunch',
      )
    })
  })

  it('cancels a meal delete without removing it or saving, returning to the edit row', async () => {
    const user = userEvent.setup()
    await db.dailyEntries.put(
      makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
    )
    await renderMealEditScreen()

    await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    // Back in the edit row — the item's staged draft is untouched, still
    // showing its 300 kcal total on the compact summary row.
    expect(screen.getByText(/300 kcal/)).toBeInTheDocument()
    expect(await db.dailyEntries.get('e1')).toMatchObject({
      calorieEntries: [{ id: 'c1' }, { id: 'c2' }],
    })
  })

  it("edits a meal note and an item's reaction and saves immediately (#129)", async () => {
    const user = userEvent.setup()
    await db.dailyEntries.put(
      makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
    )
    await renderMealEditScreen()

    await user.type(
      screen.getByLabelText('Meal note — Meal 1'),
      'Ate a salad, it was good.',
    )
    await user.click(screen.getByRole('button', { name: 'Edit item' }))
    const dialog = screen.getByRole('dialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'Thumbs up' }),
    )
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(async () => {
      const saved = await db.dailyEntries.get('e1')
      expect(saved?.calorieEntries?.[0].note).toBe('Ate a salad, it was good.')
      expect(saved?.calorieEntries?.[0].items[0].emotion).toBe('thumbsUp')
    })
  })

  it("edits a meal's protein/fat/carbs and saves immediately (#51)", async () => {
    const user = userEvent.setup()
    await db.dailyEntries.put(
      makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
    )
    await renderMealEditScreen()

    await user.click(screen.getByRole('button', { name: 'Edit item' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Protein'), '20')
    await user.type(within(dialog).getByLabelText('Fat'), '10')
    await user.type(within(dialog).getByLabelText('Carbs'), '30')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(async () => {
      const saved = await db.dailyEntries.get('e1')
      expect(saved?.calorieEntries?.[0].items[0]).toMatchObject({
        proteinG: 20,
        fatG: 10,
        carbsG: 30,
      })
    })
  })

  it('renders bellissimo as the 🤌 emoji, not a lucide icon (#54)', async () => {
    const user = userEvent.setup()
    await db.dailyEntries.put(
      makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
    )
    await renderMealEditScreen()

    await user.click(screen.getByRole('button', { name: 'Edit item' }))
    const dialog = screen.getByRole('dialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'Bellissimo' }),
    )
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    // Renders the emoji, not a lucide icon, in the saved item's display.
    expect(screen.getAllByText('🤌').length).toBeGreaterThan(0)
    expect(screen.getByText('Bellissimo')).toBeInTheDocument()
  })

  describe('per 100g / per portion toggle on item-edit rows (#111)', () => {
    it('defaults to per-100g mode when opening an existing item for edit', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(
        makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
      )
      await renderMealEditScreen()

      await user.click(screen.getByRole('button', { name: 'Edit item' }))
      const dialog = screen.getByRole('dialog')

      expect(within(dialog).getByLabelText('kcal/100g')).toBeInTheDocument()
      expect(
        within(dialog).getByRole('radio', { name: '100g' }),
      ).toBeChecked()
    })

    it('saves the typed total directly in per-portion mode, no multiplication', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(
        makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
      )
      await renderMealEditScreen()

      await user.click(screen.getByRole('button', { name: 'Edit item' }))
      const dialog = screen.getByRole('dialog')
      await user.click(
        within(dialog).getByRole('radio', { name: 'Portion' }),
      )
      expect(within(dialog).getByLabelText('kcal')).toBeInTheDocument()

      await user.clear(within(dialog).getByLabelText('kcal'))
      await user.type(within(dialog).getByLabelText('kcal'), '450')
      await user.click(within(dialog).getByRole('button', { name: 'Save' }))
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(async () => {
        const saved = await db.dailyEntries.get('e1')
        expect(saved?.calorieEntries?.[0].items[0]).toEqual(
          expect.objectContaining({ amountKcal: 450 }),
        )
      })
    })

    it('converts a typed per-100g rate to an absolute total when switching to per-portion', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(
        makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
      )
      await renderMealEditScreen()

      await user.click(screen.getByRole('button', { name: 'Edit item' }))
      const dialog = screen.getByRole('dialog')
      // Meal 1's stored item is 300 kcal with no recorded amountG, so
      // itemDraftFrom's fallback shows kcal/100g = 300, portions = 1
      // (100g, #140).
      await user.clear(within(dialog).getByLabelText('× 100g'))
      await user.type(within(dialog).getByLabelText('× 100g'), '0.5')

      await user.click(
        within(dialog).getByRole('radio', { name: 'Portion' }),
      )

      // 300 kcal/100g at 0.5 portions (50g) = 150 kcal total.
      expect(within(dialog).getByLabelText('kcal')).toHaveValue('150')
    })

    it('converts an absolute total back to a per-100g rate when switching back', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(
        makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
      )
      await renderMealEditScreen()

      await user.click(screen.getByRole('button', { name: 'Edit item' }))
      const dialog = screen.getByRole('dialog')
      // The portions field is only editable in per-100g mode (#121 hides
      // it in Portion mode) — set it before switching, then switch there
      // and back.
      await user.clear(within(dialog).getByLabelText('× 100g'))
      await user.type(within(dialog).getByLabelText('× 100g'), '0.5')
      await user.click(
        within(dialog).getByRole('radio', { name: 'Portion' }),
      )
      await user.clear(within(dialog).getByLabelText('kcal'))
      await user.type(within(dialog).getByLabelText('kcal'), '150')

      await user.click(within(dialog).getByRole('radio', { name: '100g' }))

      // 150 kcal eaten as a 0.5-portion (50g) back-calculates to 300
      // kcal/100g.
      expect(within(dialog).getByLabelText('kcal/100g')).toHaveValue('300')
      expect(within(dialog).getByLabelText('× 100g')).toHaveValue('0.5')
    })

    it('shows a Portion badge instead of the portions field while in Portion mode', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(
        makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
      )
      await renderMealEditScreen()

      await user.click(screen.getByRole('button', { name: 'Edit item' }))
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByLabelText('× 100g')).toBeInTheDocument()

      await user.click(
        within(dialog).getByRole('radio', { name: 'Portion' }),
      )

      expect(
        within(dialog).queryByLabelText('× 100g'),
      ).not.toBeInTheDocument()
    })

    it('keeps each item-edit row on its own independent mode', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(
        makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
      )
      await renderMealEditScreen()

      // "+ Add item" immediately opens the new blank item's own sheet
      // (#122) — switch only this one to Portion mode, then close it.
      await user.click(
        screen.getByRole('button', { name: '+ Add item — Meal 1' }),
      )
      let dialog = screen.getByRole('dialog')
      await user.click(
        within(dialog).getByRole('radio', { name: 'Portion' }),
      )
      expect(
        within(dialog).getByRole('radio', { name: 'Portion' }),
      ).toBeChecked()
      // The Save button is disabled without a valid amount (this blank
      // draft has none) — close via the X instead, same as a cancel.
      await user.click(
        within(dialog).getByRole('button', { name: 'Close item editor' }),
      )

      // The original item (index 0) is unaffected — still defaults to
      // 100g, confirming the two drafts' modes are independent.
      await user.click(
        screen.getAllByRole('button', { name: 'Edit item' })[0],
      )
      dialog = screen.getByRole('dialog')
      expect(
        within(dialog).getByRole('radio', { name: '100g' }),
      ).toBeChecked()
    })
  })

  describe('grouping multiple items under one meal (#81)', () => {
    it('adds a found food to an existing meal via edit mode (#124)', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(
        makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
      )
      await renderMealEditScreen()

      await user.click(
        screen.getByRole('button', { name: 'Find food — Meal 1' }),
      )
      await user.click(screen.getByText('Salmon'))
      await user.click(screen.getByRole('button', { name: 'Add food' }))
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(async () => {
        const saved = await db.dailyEntries.get('e1')
        const savedItems = saved?.calorieEntries?.[0].items
        expect(savedItems).toHaveLength(2)
        expect(savedItems?.[1]).toMatchObject({
          name: 'Salmon',
          amountKcal: 208,
          proteinG: 20,
          amountG: 100,
        })
      })
    })

    it('does not add a found curated food to the personal meal dictionary (#150)', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(
        makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
      )
      await renderMealEditScreen()

      await user.click(
        screen.getByRole('button', { name: 'Find food — Meal 1' }),
      )
      await user.click(screen.getByText('Salmon'))
      await user.click(screen.getByRole('button', { name: 'Add food' }))
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(async () => {
        const saved = await db.dailyEntries.get('e1')
        expect(saved?.calorieEntries?.[0].items).toHaveLength(2)
      })
      expect(await db.mealItems.toArray()).toEqual([])
    })

    it('adds another item to an existing meal via edit mode, growing the kcal subtotal', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(
        makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
      )
      await renderMealEditScreen()

      // "+ Add item" immediately opens the new item's sheet (#122).
      await user.click(
        screen.getByRole('button', { name: '+ Add item — Meal 1' }),
      )
      const dialog = screen.getByRole('dialog')
      await user.type(within(dialog).getByLabelText('Dish name'), 'Bread')
      await user.type(within(dialog).getByLabelText('kcal/100g'), '80')
      await user.click(within(dialog).getByRole('button', { name: 'Save' }))
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(async () => {
        const saved = await db.dailyEntries.get('e1')
        const savedItems = saved?.calorieEntries?.[0].items
        expect(savedItems).toHaveLength(2)
        expect(savedItems?.[1]).toMatchObject({
          name: 'Bread',
          amountKcal: 80,
        })
      })
    })

    it('restores calories/macros for an item-edit row when a suggested name is picked (#94)', async () => {
      const user = userEvent.setup()
      await useMealItemStore.getState().touch('Bread', {
        amountKcal: 80,
        proteinG: 3,
        fatG: 1,
        carbsG: 15,
      })
      await db.dailyEntries.put(
        makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
      )
      await renderMealEditScreen()

      await user.click(
        screen.getByRole('button', { name: '+ Add item — Meal 1' }),
      )
      const dialog = screen.getByRole('dialog')
      await user.click(within(dialog).getByLabelText('Dish name'))
      await user.click(
        await within(dialog).findByRole('button', { name: 'Bread' }),
      )

      expect(within(dialog).getByLabelText('kcal/100g')).toHaveValue('80')
      expect(within(dialog).getByLabelText('Protein')).toHaveValue('3')
      expect(within(dialog).getByLabelText('Fat')).toHaveValue('1')
      expect(within(dialog).getByLabelText('Carbs')).toHaveValue('15')
    })

    it('edits a portion weight in grams on an item and saves it (#93, #140)', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(
        makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
      )
      await renderMealEditScreen()

      await user.click(screen.getByRole('button', { name: 'Edit item' }))
      const dialog = screen.getByRole('dialog')
      await user.clear(within(dialog).getByLabelText('× 100g'))
      await user.type(within(dialog).getByLabelText('× 100g'), '3.5')
      await user.click(within(dialog).getByRole('button', { name: 'Save' }))
      await user.click(screen.getByRole('button', { name: 'Save' }))

      // The item had no recorded amountG, so its 300 kcal was treated as
      // the per-100g rate (#96's portions-1 fallback); scaled by the new
      // 3.5 portions (350g, #140): 300 * 3.5 = 1050.
      await waitFor(async () => {
        const saved = await db.dailyEntries.get('e1')
        expect(saved?.calorieEntries?.[0].items[0]).toMatchObject({
          amountKcal: 1050,
          amountG: 350,
        })
      })
    })

    it('restores the portion weight in grams for an item-edit row when a suggested name is picked (#93, #140)', async () => {
      const user = userEvent.setup()
      await useMealItemStore.getState().touch('Bread', {
        amountKcal: 80,
        amountG: 30,
      })
      await db.dailyEntries.put(
        makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
      )
      await renderMealEditScreen()

      await user.click(
        screen.getByRole('button', { name: '+ Add item — Meal 1' }),
      )
      const dialog = screen.getByRole('dialog')
      await user.click(within(dialog).getByLabelText('Dish name'))
      await user.click(
        await within(dialog).findByRole('button', { name: 'Bread' }),
      )

      // 30g back-calculates to 0.3 portions of 100g.
      expect(within(dialog).getByLabelText('× 100g')).toHaveValue('0.3')
    })

    it('removing every item from a meal during edit deletes the whole meal on save', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(
        makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
      )
      await renderMealEditScreen()

      await user.click(screen.getByRole('button', { name: 'Delete item' }))
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(async () => {
        const saved = await db.dailyEntries.get('e1')
        expect(saved?.calorieEntries?.map((c) => c.id)).toEqual(['c2'])
      })
    })

    it('shows each item name and kcal in the read-only view', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(
        makeEntry({ calorieEntries: [calories(300, 'c1'), calories(200, 'c2')] }),
      )
      await renderMealEditScreen()

      await user.click(
        screen.getAllByRole('button', { name: 'Edit item' })[0],
      )
      let dialog = screen.getByRole('dialog')
      await user.type(within(dialog).getByLabelText('Dish name'), 'Soup')
      await user.click(within(dialog).getByRole('button', { name: 'Save' }))

      // "+ Add item" immediately opens the new item's own sheet (#122).
      await user.click(
        screen.getByRole('button', { name: '+ Add item — Meal 1' }),
      )
      dialog = screen.getByRole('dialog')
      await user.type(within(dialog).getByLabelText('Dish name'), 'Bread')
      await user.type(within(dialog).getByLabelText('kcal/100g'), '80')
      await user.click(within(dialog).getByRole('button', { name: 'Save' }))

      // Split across a nested <span> (the kcal part is styled separately),
      // so a single-string getByText can't match it in one go — check via
      // the containing row's combined textContent instead.
      expect(screen.getByText('Soup').closest('li')).toHaveTextContent(
        '300 kcal',
      )
      expect(screen.getByText('Bread').closest('li')).toHaveTextContent(
        '80 kcal',
      )
    })
  })

  describe('time eaten (#65)', () => {
    it('can be edited on an existing meal', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(
        makeEntry({
          calorieEntries: [{ ...calories(300, 'c1'), timeEaten: '08:00' }],
        }),
      )
      await renderMealEditScreen()

      expect(screen.getByLabelText('Time — Meal 1')).toHaveValue('08:00')
      fireEvent.change(screen.getByLabelText('Time — Meal 1'), {
        target: { value: '12:30' },
      })
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(async () => {
        const saved = await db.dailyEntries.get('e1')
        expect(saved?.calorieEntries?.[0].timeEaten).toBe('12:30')
      })
    })

    it('item-edit row also has an app-level clear button (#117)', async () => {
      const user = userEvent.setup()
      await db.dailyEntries.put(
        makeEntry({
          calorieEntries: [{ ...calories(300, 'c1'), timeEaten: '08:00' }],
        }),
      )
      await renderMealEditScreen()

      expect(
        screen.getByRole('button', { name: 'Clear time — Meal 1' }),
      ).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Clear time — Meal 1' }),
      )

      expect(screen.getByLabelText('Time — Meal 1')).toHaveValue('')
    })
  })
})
