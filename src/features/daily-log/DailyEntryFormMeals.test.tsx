/** #863 — moved from DailyEntryForm.test.tsx; assertions unchanged. */
import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CalorieEntry } from '@/domain/dailyEntry'
import { useMealItemStore } from '@/stores'
import { DailyEntryForm } from './DailyEntryForm'
import {
  expectMealCard,
  now,
  openAddItemFlow,
  render,
} from './dailyEntryFormTestUtils'

describe('DailyEntryForm', () => {
  describe('calories', () => {
    it('has no direct-entry calories field', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      expect(screen.queryByLabelText('Calories')).not.toBeInTheDocument()
    })

    // #326 — the big "X kcal today" readout was removed as pure duplicate
    // information (always the same number as TodayScreen's "Remaining
    // calories" breakdown card's own "consumed" figure); this only
    // asserts it's actually gone, not what replaced it (that lives on
    // TodayScreen, not this form).
    it('no longer shows a standalone kcal-today readout (#326)', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      expect(screen.queryByText('kcal today')).not.toBeInTheDocument()
    })

    // #327 — the "Calories" label + its day-lag info tooltip were left
    // behind by #326 even after the number readout they used to sit next
    // to was removed, so they no longer labeled anything. Both are gone.
    it('no longer shows the orphaned "Calories" label or its tooltip (#327)', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      expect(screen.queryByText('Calories')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'About the calories field' }),
      ).not.toBeInTheDocument()
    })

    describe('unusually high daily total warning (#218)', () => {
      function entriesWithTotal(totalKcal: number): CalorieEntry[] {
        return [
          {
            id: 'c1',
            items: [{ id: 'i1', amountKcal: totalKcal }],
            createdAt: now,
          },
        ]
      }

      it('warns when the day total crosses the threshold', () => {
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              calorieEntries: entriesWithTotal(6500),
              createdAt: now,
              updatedAt: now,
            }}
            onSave={vi.fn()}
          />,
        )

        expect(
          screen.getByText(/unusually high for one day/),
        ).toBeInTheDocument()
      })

      it('does not warn for an ordinary day total', () => {
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              calorieEntries: entriesWithTotal(2200),
              createdAt: now,
              updatedAt: now,
            }}
            onSave={vi.fn()}
          />,
        )

        expect(
          screen.queryByText(/unusually high for one day/),
        ).not.toBeInTheDocument()
      })
    })

    it('labels the flyout with the meal number it will create (#95)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: '+ Add a meal' }),
      )
      expect(
        screen.getByRole('heading', { name: 'Breakfast' }),
      ).toBeInTheDocument()

      await openAddItemFlow(user)
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await user.click(screen.getByRole('button', { name: 'Done' }))

      expectMealCard('Breakfast', '200 kcal')

      await user.click(
        screen.getByRole('button', { name: '+ Add another meal' }),
      )
      expect(
        screen.getByRole('heading', { name: 'Lunch' }),
      ).toBeInTheDocument()
    })

    it('adds a meal and saves it immediately', async () => {
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
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(
        onSave.mock.calls[0][0].calorieEntries.map(
          (c: CalorieEntry) => c.items[0].amountKcal,
        ),
      ).toEqual([200])
      expectMealCard('Breakfast', '200 kcal')
      // The sheet closes on save, so the field itself is gone — the reset
      // is verified by reopening the (now-blank) sheet instead.
      await openAddItemFlow(user)
      expect(screen.getByLabelText('kcal/100g')).toHaveValue('')
    })

    it('logs a note and an item reaction together with the amount in one Add action (#129)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      // The note is a meal-level field in the flyout's own header (#454),
      // not part of the per-item sheet — has to be typed once the flyout
      // is open, before diving into manual entry for the item itself.
      await user.click(
        screen.getByRole('button', { name: '+ Add a meal' }),
      )
      await user.type(
        screen.getByLabelText('Meal note'),
        'Ate chocolates, they were good.',
      )
      await openAddItemFlow(user)
      await user.click(screen.getByRole('button', { name: 'Thumbs up' }))
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await user.click(screen.getByRole('button', { name: 'Done' }))

      expectMealCard('Breakfast', '200 kcal')
      expect(
        screen.getByText('Ate chocolates, they were good.'),
      ).toBeInTheDocument()
    })

    it('logs protein/fat/carbs alongside the amount (#51)', async () => {
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
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.type(screen.getByLabelText('Protein'), '20')
      await user.type(screen.getByLabelText('Fat'), '10')
      await user.type(screen.getByLabelText('Carbs'), '30')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSave.mock.calls[0][0].calorieEntries[0].items[0]).toMatchObject({
        amountKcal: 200,
        proteinG: 20,
        fatG: 10,
        carbsG: 30,
      })
      // The per-day total (#462) now lives on its own StatCard (#467) —
      // kcal as the big value, macros as the description below it.
      const consumedCard = screen
        .getByText('Consumed')
        .closest('[data-slot="card"]') as HTMLElement
      expect(within(consumedCard).getByText('200')).toBeInTheDocument()
      expect(
        within(consumedCard).getByText('Protein 20g · Fat 10g · Carbs 30g'),
      ).toBeInTheDocument()
      // The meal's own totals line (#473) uses compact initials and leads
      // with kcal — distinct from the day-total card's full-word macros.
      expect(
        screen.getByText('200 kcal · P 20g · F 10g · C 30g'),
      ).toBeInTheDocument()
    })

    it('scales per-100g kcal and macros by the portions eaten (#96, #140)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      // A food rated 200 kcal / 20g protein / 10g fat / 4g carbs per 100g,
      // actually eaten as a 50g portion — half a 100g portion.
      await openAddItemFlow(user)
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.type(screen.getByLabelText('Protein'), '20')
      await user.type(screen.getByLabelText('Fat'), '10')
      await user.type(screen.getByLabelText('Carbs'), '4')
      await user.clear(screen.getByLabelText('× 100g'))
      await user.type(screen.getByLabelText('× 100g'), '0.5')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSave.mock.calls[0][0].calorieEntries[0].items[0]).toMatchObject({
        amountKcal: 100,
        proteinG: 10,
        fatG: 5,
        carbsG: 2,
        amountG: 50,
      })
    })

    it('shows a live preview of the computed total before Add is pressed (#98)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await openAddItemFlow(user)
      expect(screen.queryByText(/^Total:/)).not.toBeInTheDocument()

      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.type(screen.getByLabelText('Protein'), '20')
      await user.type(screen.getByLabelText('Fat'), '10')
      await user.type(screen.getByLabelText('Carbs'), '4')
      await user.clear(screen.getByLabelText('× 100g'))
      await user.type(screen.getByLabelText('× 100g'), '0.5')

      expect(
        screen.getByText('Total: 100 kcal · P 10g · F 5g · C 2g'),
      ).toBeInTheDocument()
    })

    it('treats a blank portion count as 1 (100g), matching the total typed directly (#96, #140)', async () => {
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
      await user.clear(screen.getByLabelText('× 100g'))
      await user.type(screen.getByLabelText('kcal/100g'), '250')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSave.mock.calls[0][0].calorieEntries[0].items[0]).toMatchObject({
        amountKcal: 250,
        amountG: 100,
      })
    })

    it('logs a portion weight in grams alongside the amount (#93, #140)', async () => {
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
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.clear(screen.getByLabelText('× 100g'))
      await user.type(screen.getByLabelText('× 100g'), '1.5')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      // 200 kcal/100g scaled by 1.5 portions (#96, #140): 200 * 1.5 = 300.
      expect(onSave.mock.calls[0][0].calorieEntries[0].items[0]).toMatchObject({
        amountKcal: 300,
        amountG: 150,
      })
      // Resets to the default portion count, not blank (#96) — 1, i.e. 100g.
      await openAddItemFlow(user)
      expect(screen.getByLabelText('× 100g')).toHaveValue('1')
    })

    it('restores the portion weight in grams when a suggested name is picked (#93, #140)', async () => {
      const user = userEvent.setup()
      await useMealItemStore.getState().touch('Pizza', {
        amountKcal: 400,
        amountG: 250,
      })
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await openAddItemFlow(user)
      await user.type(await screen.findByLabelText('Dish name'), 'P')
      await user.click(await screen.findByRole('button', { name: 'Pizza' }))

      // 250g back-calculates to 2.5 portions of 100g.
      expect(screen.getByLabelText('× 100g')).toHaveValue('2.5')
    })

    it('macros are independently optional — a meal can log only some of them', async () => {
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
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.type(screen.getByLabelText('Fat'), '10')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSave.mock.calls[0][0].calorieEntries[0].items[0]).toMatchObject({
        amountKcal: 200,
        fatG: 10,
      })
      expect(
        onSave.mock.calls[0][0].calorieEntries[0].items[0].proteinG,
      ).toBeUndefined()
      const consumedCard = screen
        .getByText('Consumed')
        .closest('[data-slot="card"]') as HTMLElement
      expect(within(consumedCard).getByText('200')).toBeInTheDocument()
      expect(
        within(consumedCard).getByText('Protein — · Fat 10g · Carbs —'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('200 kcal · P — · F 10g · C —'),
      ).toBeInTheDocument()
    })

    it('shows no macro summary line for a meal that logged none (#51)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await openAddItemFlow(user)
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      // The day-level total now always shows once *any* value — even just
      // calories — is logged (#462), with dashes for the unset macros, on
      // its own StatCard (#467).
      const consumedCard = screen
        .getByText('Consumed')
        .closest('[data-slot="card"]') as HTMLElement
      expect(within(consumedCard).getByText('200')).toBeInTheDocument()
      expect(
        within(consumedCard).getByText('Protein — · Fat — · Carbs —'),
      ).toBeInTheDocument()
      // The per-meal summary line (macro-only, unaffected by #462) stays
      // absent when no macros were logged at all — every match for this
      // text lives inside the day-total card above, none elsewhere.
      const macrosMatches = screen.getAllByText('Protein — · Fat — · Carbs —')
      expect(macrosMatches.every((el) => consumedCard.contains(el))).toBe(
        true,
      )
    })
  })
})
