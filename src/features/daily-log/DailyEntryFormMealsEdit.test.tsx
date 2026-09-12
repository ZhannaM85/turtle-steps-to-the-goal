/** #863 — moved from DailyEntryForm.test.tsx; assertions unchanged. */
import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CalorieEntry } from '@/domain/dailyEntry'
import { DailyEntryForm } from './DailyEntryForm'
import {
  calories,
  expectMealCard,
  now,
  openAddItemFlow,
  render,
} from './dailyEntryFormTestUtils'

describe('DailyEntryForm', () => {
  describe('calories', () => {
    describe('itemized meal editing', () => {
      function renderWithMeals(onSave = vi.fn()) {
        return render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              calorieEntries: [calories(300, 'c1'), calories(200, 'c2')],
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )
      }

      // #157/#461: existing-meal edit coverage moved off this form — first
      // to MealEditScreen (#157), then into MealList's in-place
      // AddMealDialog overlay (#461). See MealList.test.tsx /
      // AddMealDialog.test.tsx.

      describe('custom meal name (#110)', () => {
        it('shows a custom label instead of the default numbering when set', () => {
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={{
                id: 'e1',
                date: '2026-03-01',
                calorieEntries: [
                  { ...calories(300, 'c1'), label: 'Breakfast' },
                ],
                createdAt: now,
                updatedAt: now,
              }}
              onSave={vi.fn()}
            />,
          )

          expectMealCard('Breakfast', '300 kcal')
          expect(screen.queryByText(/^Meal 1/)).not.toBeInTheDocument()
        })

        it('defaults unlabeled meals to Breakfast/Lunch/Dinner/Snack by position (#141)', () => {
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={{
                id: 'e1',
                date: '2026-03-01',
                calorieEntries: [
                  calories(100, 'c1'),
                  calories(200, 'c2'),
                  calories(300, 'c3'),
                  calories(400, 'c4'),
                ],
                createdAt: now,
                updatedAt: now,
              }}
              onSave={vi.fn()}
            />,
          )

          expectMealCard('Breakfast', '100 kcal')
          expectMealCard('Lunch', '200 kcal')
          expectMealCard('Dinner', '300 kcal')
          expectMealCard('Snack', '400 kcal')
        })

        it('falls back to positional "Meal N" from the 5th meal onward (#141)', () => {
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={{
                id: 'e1',
                date: '2026-03-01',
                calorieEntries: [
                  calories(100, 'c1'),
                  calories(200, 'c2'),
                  calories(300, 'c3'),
                  calories(400, 'c4'),
                  calories(500, 'c5'),
                ],
                createdAt: now,
                updatedAt: now,
              }}
              onSave={vi.fn()}
            />,
          )

          expectMealCard('Meal 5', '500 kcal')
        })

        // #157: "sets a custom label...", "saves a custom label on
        // #157/#461: label-field edit coverage moved off this form — see
        // MealList.test.tsx / AddMealDialog.test.tsx.
      })

      it('deletes a meal with a two-step confirm and saves immediately', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        renderWithMeals(onSave)

        await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
        await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
        expect(screen.getByText('Delete this entry?')).toBeInTheDocument()
        expect(onSave).not.toHaveBeenCalled()

        await user.click(screen.getByRole('button', { name: 'Delete' }))

        expect(screen.queryByText(/300 kcal/)).not.toBeInTheDocument()
        expectMealCard('Breakfast', '200 kcal')
        expect(onSave).toHaveBeenCalledTimes(1)
        expect(
          onSave.mock.calls[0][0].calorieEntries.map(
            (c: CalorieEntry) => c.items[0].amountKcal,
          ),
        ).toEqual([200])
      })

      it('deletes a meal directly from the view row, without opening edit mode first (#97)', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        renderWithMeals(onSave)

        await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
        expect(screen.getByText('Delete this entry?')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Delete' }))

        expect(screen.queryByText(/300 kcal/)).not.toBeInTheDocument()
        expectMealCard('Breakfast', '200 kcal')
        expect(onSave).toHaveBeenCalledTimes(1)
      })

      // #157/#461: meal-note / reaction / macro edit coverage moved off
      // this form — see MealList.test.tsx / AddMealDialog.test.tsx.

      // #468 — drag-to-reorder removed entirely (reported live as broken,
      // couldn't actually swap two meals) along with its 3 tests here.
      // See #471 for the planned replacement, an on-demand toggle mode
      // like TodayScreen's own Stats section reorder, not always-on drag
      // handles.

      describe('per 100g / per portion toggle (#111)', () => {
        it('defaults to per-100g mode, unchanged from before this feature', async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={vi.fn()}
            />,
          )

          await openAddItemFlow(user)
          expect(screen.getByLabelText('kcal/100g')).toBeInTheDocument()
          expect(screen.getByRole('radio', { name: '100g' })).toBeChecked()
        })

        it('saves the typed total directly in per-portion mode, no multiplication', async () => {
          const user = userEvent.setup()
          const onSave = vi.fn()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={onSave}
            />,
          )

          await openAddItemFlow(user)
          await user.click(screen.getByRole('radio', { name: 'Portion' }))
          expect(screen.getByLabelText('kcal')).toBeInTheDocument()

          await user.type(screen.getByLabelText('kcal'), '450')
          await user.type(screen.getByLabelText('Protein'), '20')
          await user.click(screen.getByRole('button', { name: 'Save' }))

          const item = onSave.mock.calls[0][0].calorieEntries[0].items[0]
          expect(item.amountKcal).toBe(450)
          expect(item.proteinG).toBe(20)
        })

        it('shows the unscaled total in the live preview while in per-portion mode', async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={vi.fn()}
            />,
          )

          await openAddItemFlow(user)
          await user.click(screen.getByRole('radio', { name: 'Portion' }))
          await user.type(screen.getByLabelText('kcal'), '450')

          expect(screen.getByText('Total: 450 kcal')).toBeInTheDocument()
        })

        it('converts a typed per-100g rate to an absolute total when switching to per-portion', async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={vi.fn()}
            />,
          )

          await openAddItemFlow(user)
          await user.type(screen.getByLabelText('kcal/100g'), '300')
          await user.clear(screen.getByLabelText('× 100g'))
          await user.type(screen.getByLabelText('× 100g'), '0.5')

          await user.click(screen.getByRole('radio', { name: 'Portion' }))

          // 300 kcal/100g at 0.5 portions (50g) = 150 kcal total.
          expect(screen.getByLabelText('kcal')).toHaveValue('150')
        })

        it('converts an absolute total back to a per-100g rate when switching back', async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={vi.fn()}
            />,
          )

          // The portions field is only editable in per-100g mode (#121
          // hides it in Portion mode, as a read-only memory aid) — set it
          // before switching, then switch there and back.
          await openAddItemFlow(user)
          await user.clear(screen.getByLabelText('× 100g'))
          await user.type(screen.getByLabelText('× 100g'), '0.5')
          await user.click(screen.getByRole('radio', { name: 'Portion' }))
          await user.clear(screen.getByLabelText('kcal'))
          await user.type(screen.getByLabelText('kcal'), '150')

          await user.click(screen.getByRole('radio', { name: '100g' }))

          // 150 kcal eaten as a 0.5-portion (50g) back-calculates to 300
          // kcal/100g.
          expect(screen.getByLabelText('kcal/100g')).toHaveValue('300')
          expect(screen.getByLabelText('× 100g')).toHaveValue('0.5')
        })

        // #457 — the field used to become a non-interactive "Portion"
        // badge in Portion mode (a portions-count *multiplier* there would
        // have been confusing); it's now a real, optional weight-in-grams
        // field instead, so a per-100g rate can still be back-calculated
        // later even for an item entered as a direct total.
        it('shows an optional weight field, not a portions multiplier, while in Portion mode', async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={vi.fn()}
            />,
          )

          await openAddItemFlow(user)
          expect(screen.getByLabelText('× 100g')).toBeInTheDocument()
          expect(screen.queryByLabelText('Weight (g)')).not.toBeInTheDocument()

          await user.click(screen.getByRole('radio', { name: 'Portion' }))

          expect(screen.queryByLabelText('× 100g')).not.toBeInTheDocument()
          expect(screen.getByLabelText('Weight (g)')).toBeInTheDocument()

          await user.click(screen.getByRole('radio', { name: '100g' }))

          expect(screen.getByLabelText('× 100g')).toBeInTheDocument()
        })

        it('records a portion-mode weight and converts it to a per-100g rate when switching back', async () => {
          const user = userEvent.setup()
          const onSave = vi.fn()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={onSave}
            />,
          )

          await openAddItemFlow(user)
          await user.click(screen.getByRole('radio', { name: 'Portion' }))
          await user.type(screen.getByLabelText('kcal'), '450')
          await user.type(screen.getByLabelText('Protein'), '30')
          await user.clear(screen.getByLabelText('Weight (g)'))
          await user.type(screen.getByLabelText('Weight (g)'), '150')
          await user.click(screen.getByRole('button', { name: 'Save' }))

          const item = onSave.mock.calls[0][0].calorieEntries[0].items[0]
          expect(item.amountKcal).toBe(450)
          expect(item.proteinG).toBe(30)
          expect(item.amountG).toBe(150)
        })

        // #457 — the weight field holds real grams in Portion mode, a
        // different unit than per-100g mode's own portions-*count* field
        // (e.g. "1.5" meaning 150g there) — switching modes has to convert
        // between the two, not reuse the raw number as-is. A regression
        // here previously ran the Portion→per-100g conversion through
        // portionsToGrams() a second time (150g → treated as "150
        // portions" → 15000g), producing a wildly wrong back-calculated
        // rate (3 kcal/100g) instead of the correct one.
        it('back-calculates the correct per-100g rate from a portion-mode weight when switching modes', async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={vi.fn()}
            />,
          )

          await openAddItemFlow(user)
          await user.click(screen.getByRole('radio', { name: 'Portion' }))
          await user.type(screen.getByLabelText('kcal'), '450')
          await user.clear(screen.getByLabelText('Weight (g)'))
          await user.type(screen.getByLabelText('Weight (g)'), '150')

          await user.click(screen.getByRole('radio', { name: '100g' }))

          // 450 kcal for a 150g portion = 300 kcal/100g.
          expect(screen.getByLabelText('kcal/100g')).toHaveValue('300')
          expect(screen.getByLabelText('× 100g')).toHaveValue('1.5')
        })

        it('resets to per-100g mode after a successful Add', async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={vi.fn()}
            />,
          )

          await openAddItemFlow(user)
          await user.click(screen.getByRole('radio', { name: 'Portion' }))
          await user.type(screen.getByLabelText('kcal'), '450')
          await user.click(screen.getByRole('button', { name: 'Save' }))

          // The sheet closes on save — reopen it (blank, freshly reset) to
          // check the mode was reset.
          await openAddItemFlow(user)
          expect(screen.getByRole('radio', { name: '100g' })).toBeChecked()
          expect(screen.getByLabelText('kcal/100g')).toBeInTheDocument()
        })
      })
    })
  })
})
