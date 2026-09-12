/** #863 — moved from DailyEntryForm.test.tsx; assertions unchanged. */
import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DailyEntryForm } from './DailyEntryForm'
import {
  expectMealCard,
  now,
  openAddItemFlow,
  render,
} from './dailyEntryFormTestUtils'

describe('DailyEntryForm', () => {
  describe('calories', () => {
    describe('itemized meal editing', () => {
      // #157: the entire "per 100g / per portion toggle on item-edit rows
      // #157/#461: per-100g / multi-item edit coverage moved off this
      // form — see MealList.test.tsx / AddMealDialog.test.tsx.

      describe('time eaten (#65)', () => {
        it('saves the time set in the Add flow, shown next to the meal', async () => {
          const user = userEvent.setup()
          const onSave = vi.fn()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={onSave}
            />,
          )

          // Time lives in the flyout's own header (#454) — open it first.
          await user.click(
            screen.getByRole('button', { name: '+ Add a meal' }),
          )
          fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: '08:15' },
          })
          await openAddItemFlow(user)
          await user.type(screen.getByLabelText('kcal/100g'), '200')
          await user.click(screen.getByRole('button', { name: 'Save' }))

          expect(onSave.mock.calls[0][0].calorieEntries[0].timeEaten).toBe(
            '08:15',
          )
          expect(screen.getByText('08:15')).toBeInTheDocument()
        })

        it('can be left blank', async () => {
          const user = userEvent.setup()
          const onSave = vi.fn()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={onSave}
            />,
          )

          await user.click(
            screen.getByRole('button', { name: '+ Add a meal' }),
          )
          fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: '' },
          })
          await openAddItemFlow(user)
          await user.type(screen.getByLabelText('kcal/100g'), '200')
          await user.click(screen.getByRole('button', { name: 'Save' }))

          expect(
            onSave.mock.calls[0][0].calorieEntries[0].timeEaten,
          ).toBeUndefined()
        })

        it('has an app-level clear button, since the native picker Reset is unreliable (#117)', async () => {
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

          // #357: Time now defaults to the current time (not blank), so the
          // clear button already shows up as soon as the flyout opens.
          expect(
            screen.getByRole('button', { name: 'Clear time' }),
          ).toBeInTheDocument()

          await user.click(screen.getByRole('button', { name: 'Clear time' }))

          expect(screen.getByLabelText('Time')).toHaveValue('')
          expect(
            screen.queryByRole('button', { name: 'Clear time' }),
          ).not.toBeInTheDocument()

          fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: '08:15' },
          })
          expect(
            screen.getByRole('button', { name: 'Clear time' }),
          ).toBeInTheDocument()
        })

        // #157/#461: existing-meal time-eaten edit coverage moved off
        // this form — see MealList.test.tsx / AddMealDialog.test.tsx.

        // #468 — drag-to-reorder removed; see the comment where its other
        // tests used to sit, above.
      })

      describe('food picker (#62)', () => {
        it('opens the food dialog from the Find food button and adds a scaled meal', async () => {
          const user = userEvent.setup()
          const onSave = vi.fn()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={onSave}
            />,
          )

          await user.click(
            screen.getByRole('button', { name: '+ Add a meal' }),
          )
          await user.type(screen.getByLabelText('Search foods'), 'Salmon')
          await user.click(screen.getByText('Salmon', { exact: true }))
          await user.click(screen.getByRole('button', { name: 'Save' }))

          expect(onSave).toHaveBeenCalledTimes(1)
          const entry = onSave.mock.calls[0][0].calorieEntries[0]
          expect(entry.items[0].amountKcal).toBe(208)
          expect(entry.items[0].proteinG).toBe(20)
          expect(entry.items[0].name).toBe('Salmon')
          // The quantity used to scale the totals is stored too (#96), so
          // this item can later be edited the same per-100g + quantity way
          // a manually-entered one can, at the default 100g quantity.
          expect(entry.items[0].amountG).toBe(100)
          expectMealCard('Breakfast', '208 kcal')
        })

        // #296: previously always stamped the current clock time,
        // silently discarding a time the user had already set in the
        // flyout's own field before picking a food via search.
        it('uses the flyout time field instead of the current clock time when set (#296)', async () => {
          const user = userEvent.setup()
          const onSave = vi.fn()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={onSave}
            />,
          )

          await user.click(
            screen.getByRole('button', { name: '+ Add a meal' }),
          )
          fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: '07:30' },
          })
          await user.type(screen.getByLabelText('Search foods'), 'Salmon')
          await user.click(screen.getByText('Salmon', { exact: true }))
          await user.click(screen.getByRole('button', { name: 'Save' }))

          const entry = onSave.mock.calls[0][0].calorieEntries[0]
          expect(entry.timeEaten).toBe('07:30')
        })

        it("previews today's new running total when a food is picked, before it's added (#273)", async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={{
                id: 'e1',
                date: '2026-03-01',
                calorieEntries: [
                  {
                    id: 'c1',
                    items: [{ id: 'i1', name: 'Breakfast', amountKcal: 300 }],
                    createdAt: '2026-01-01T00:00:00.000Z',
                  },
                ],
                createdAt: now,
                updatedAt: now,
              }}
              onSave={vi.fn()}
            />,
          )

          await user.click(
            screen.getByRole('button', { name: '+ Add another meal' }),
          )
          await user.type(screen.getByLabelText('Search foods'), 'Salmon')
          await user.click(screen.getByText('Salmon', { exact: true }))

          expect(
            screen.getByText(
              'Today would be: 508 kcal · P 20g · F 13g · C 0g (was 300 kcal · P 0g · F 0g · C 0g)',
            ),
          ).toBeInTheDocument()
        })

        it('stores the actual quantity picked, not just the default (#96)', async () => {
          const user = userEvent.setup()
          const onSave = vi.fn()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={onSave}
            />,
          )

          await user.click(
            screen.getByRole('button', { name: '+ Add a meal' }),
          )
          await user.type(screen.getByLabelText('Search foods'), 'Salmon')
          await user.click(screen.getByText('Salmon', { exact: true }))
          // #645 — a curated food pick opens in per100g mode; 0.5 portions
          // of the 100g rate is 50g.
          const portionsInput = screen.getByLabelText('× 100g')
          await user.clear(portionsInput)
          await user.type(portionsInput, '0.5')
          await user.click(screen.getByRole('button', { name: 'Save' }))

          const entry = onSave.mock.calls[0][0].calorieEntries[0]
          expect(entry.items[0].amountKcal).toBe(104)
          expect(entry.items[0].amountG).toBe(50)
        })

        it('lets a food found via search be rated before adding (#134)', async () => {
          const user = userEvent.setup()
          const onSave = vi.fn()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={onSave}
            />,
          )

          await user.click(
            screen.getByRole('button', { name: '+ Add a meal' }),
          )
          await user.type(screen.getByLabelText('Search foods'), 'Salmon')
          await user.click(screen.getByText('Salmon', { exact: true }))
          await user.click(
            screen.getByRole('button', { name: 'Bellissimo — Salmon' }),
          )
          await user.click(screen.getByRole('button', { name: 'Save' }))

          const entry = onSave.mock.calls[0][0].calorieEntries[0]
          expect(entry.items[0].emotion).toBe('bellissimo')
        })
      })
    })
  })
})
