/** #863 — moved from DailyEntryForm.test.tsx; assertions unchanged. */
import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CalorieEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useMealItemStore } from '@/stores'
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
    it('shows a read-only per-day macro total next to the kcal total (#51)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      // Two *separate* meals (closing the flyout between them via Done) —
      // #454's persistent multi-add would otherwise land both items in the
      // same in-progress meal, whose own summary line would then read
      // identically to the day total this test is actually checking.
      await openAddItemFlow(user)
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.type(screen.getByLabelText('Protein'), '20')
      await user.type(screen.getByLabelText('Fat'), '10')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await user.click(screen.getByRole('button', { name: 'Done' }))

      await openAddItemFlow(user)
      await user.type(screen.getByLabelText('kcal/100g'), '150')
      await user.type(screen.getByLabelText('Protein'), '5')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await user.click(screen.getByRole('button', { name: 'Done' }))

      // Day total: 350 kcal (200+150), 25g protein (20+5), 10g fat (only
      // meal 1), no carbs logged. Own StatCard (#467) — kcal as the big
      // value, macros as the description below it.
      const consumedCard = screen
        .getByText('Consumed')
        .closest('[data-slot="card"]') as HTMLElement
      expect(within(consumedCard).getByText('350')).toBeInTheDocument()
      expect(
        within(consumedCard).getByText('Protein 25g · Fat 10g · Carbs —'),
      ).toBeInTheDocument()
    })

    it('adds a meal note to the reusable meal-items library (#50)', async () => {
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
      await user.type(screen.getByLabelText('Dish name'), 'Pizza')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      // Wait until the meal card has rendered (kcal appears both on the
      // totals line and the dish row after #473), then assert the library.
      await screen.findAllByText('200 kcal')
      expect(await db.mealItems.toArray()).toEqual([
        expect.objectContaining({ name: 'Pizza' }),
      ])
    })

    it('offers previously logged meal names as suggestions while typing (#86)', async () => {
      const user = userEvent.setup()
      await useMealItemStore.getState().touch('Pizza', { amountKcal: 400 })
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await openAddItemFlow(user)
      const nameInput = await screen.findByLabelText('Dish name')
      await user.type(nameInput, 'Pi')

      expect(
        await screen.findByRole('button', { name: 'Pizza' }),
      ).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Pizza' }))
      expect(nameInput).toHaveValue('Pizza')
    })

    it('restores calories/macros when a suggested name is picked (#94)', async () => {
      const user = userEvent.setup()
      await useMealItemStore.getState().touch('Pizza', {
        amountKcal: 400,
        proteinG: 15,
        fatG: 12,
        carbsG: 50,
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

      expect(screen.getByLabelText('kcal/100g')).toHaveValue('400')
      expect(screen.getByLabelText('Protein')).toHaveValue('15')
      expect(screen.getByLabelText('Fat')).toHaveValue('12')
      expect(screen.getByLabelText('Carbs')).toHaveValue('50')
    })

    it('accumulates repeated quick-adds onto the existing calories total', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            calorieEntries: [calories(400, 'c1')],
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      await openAddItemFlow(user)
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      // The existing entry already occupies the Breakfast slot, so this
      // one becomes Lunch.
      expectMealCard('Lunch', '200 kcal')
      // Closing the flyout (#454) ends this meal, so the *next* add starts
      // a fresh one (Dinner) instead of appending a second item onto Lunch.
      await user.click(screen.getByRole('button', { name: 'Done' }))

      await openAddItemFlow(user)
      await user.type(screen.getByLabelText('kcal/100g'), '150')
      await user.keyboard('{Enter}')
      expectMealCard('Dinner', '150 kcal')
      expect(onSave).toHaveBeenCalledTimes(2)
      // #326 — this form no longer displays a running total of its own
      // (TodayScreen's breakdown card owns that now), so accumulation is
      // verified via the actual saved payload instead of a UI readout.
      const lastSavedTotal = onSave.mock.calls[1][0].calorieEntries.reduce(
        (sum: number, c: CalorieEntry) =>
          sum + c.items.reduce((s: number, i) => s + i.amountKcal, 0),
        0,
      )
      expect(lastSavedTotal).toBe(750)
    })

    it('toggles an emotion selection off when clicked again (#129)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await openAddItemFlow(user)
      const thumbsUpButton = screen.getByRole('button', { name: 'Thumbs up' })
      await user.click(thumbsUpButton)
      expect(thumbsUpButton).toHaveAttribute('aria-pressed', 'true')

      await user.click(thumbsUpButton)
      expect(thumbsUpButton).toHaveAttribute('aria-pressed', 'false')

      await user.type(screen.getByLabelText('kcal/100g'), '150')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expectMealCard('Breakfast', '150 kcal')
      expect(screen.queryByText('Thumbs up')).not.toBeInTheDocument()
    })

    it('ignores a quick-add of zero or an empty amount', async () => {
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
      await user.type(screen.getByLabelText('kcal/100g'), '0')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSave).not.toHaveBeenCalled()
      // #473 — no meal card at all, rather than one reading "0 kcal": the
      // card's own edit control is the reliable marker now that its header
      // no longer carries the total.
      expect(
        screen.queryByRole('button', { name: 'Edit meal 1' }),
      ).not.toBeInTheDocument()
    })

    it('disables Add until a valid kcal/100g rate is entered (#109)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await openAddItemFlow(user)
      const saveButton = screen.getByRole('button', { name: 'Save' })
      expect(saveButton).toBeDisabled()

      await user.type(screen.getByLabelText('kcal/100g'), '0')
      expect(saveButton).toBeDisabled()

      await user.clear(screen.getByLabelText('kcal/100g'))
      await user.type(screen.getByLabelText('kcal/100g'), '150')
      expect(saveButton).toBeEnabled()
    })
  })
})
