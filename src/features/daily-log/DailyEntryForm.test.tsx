/** #863 — core smoke + Next Morning Weight. Section files:
 *  Morning*, Meals*, Water, Evening*, NightFood*, Visibility.
 *  Shared setup: dailyEntryFormTestUtils.ts. Assertions unchanged. */
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/infrastructure/persistence/indexeddb'
import { DailyEntryForm } from './DailyEntryForm'
import {
  now,
  openAddItemFlow,
  render,
} from './dailyEntryFormTestUtils'

describe('DailyEntryForm', () => {
  it('has no whole-form submit button — every field saves independently', () => {
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSave={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Log entry' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Update entry' }),
    ).not.toBeInTheDocument()
  })

  it('merges saves across multiple independent actions into the same entry', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
    )

    await user.type(screen.getByLabelText('Weight (kg)'), '80')
    await user.click(screen.getByRole('button', { name: 'Save weight' }))

    await openAddItemFlow(user)
    await user.type(screen.getByLabelText('kcal/100g'), '300')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledTimes(2)
    const secondCallEntry = onSave.mock.calls[1][0]
    expect(secondCallEntry.weightKg).toBe(80)
    expect(secondCallEntry.calorieEntries).toHaveLength(1)
    expect(secondCallEntry.id).toBe(onSave.mock.calls[0][0].id)
  })

  describe('Next Morning Weight (#829)', () => {
    afterEach(async () => {
      await db.dailyEntries.clear()
    })

    it('hides the card when the next calendar day has no weight', async () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            weightKg: 59.65,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      expect(screen.getByText('Night food')).toBeInTheDocument()
      await expect(
        screen.findByText('Next Morning Weight', {}, { timeout: 250 }),
      ).rejects.toThrow()
    })

    it('shows the next morning weight and signed change when both days have weight', async () => {
      await db.dailyEntries.put({
        id: 'next-1',
        date: '2026-03-02',
        weightKg: 59.95,
        createdAt: now,
        updatedAt: now,
      })
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            weightKg: 59.65,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      expect(await screen.findByText('Next Morning Weight')).toBeInTheDocument()
      expect(
        screen.getByText('Weight the following morning'),
      ).toBeInTheDocument()
      expect(screen.getByText('59.95')).toBeInTheDocument()
      expect(screen.getByText('+0.3 kg')).toBeInTheDocument()
    })

    it('collapses Next Morning Weight like Evening (#831)', async () => {
      await db.dailyEntries.put({
        id: 'next-1',
        date: '2026-03-02',
        weightKg: 59.95,
        createdAt: now,
        updatedAt: now,
      })
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            weightKg: 59.65,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      expect(await screen.findByText('59.95')).toBeInTheDocument()
      await user.click(
        screen.getByRole('button', { name: 'Hide next morning weight' }),
      )
      expect(screen.queryByText('59.95')).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Show next morning weight' }),
      ).toBeInTheDocument()
    })

    it('omits the signed change when this day has no weight', async () => {
      await db.dailyEntries.put({
        id: 'next-1',
        date: '2026-03-02',
        weightKg: 59.95,
        createdAt: now,
        updatedAt: now,
      })
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(await screen.findByText('Next Morning Weight')).toBeInTheDocument()
      expect(screen.getByText('59.95')).toBeInTheDocument()
      expect(screen.queryByText('+0.3 kg')).not.toBeInTheDocument()
    })

    it('does not skip ahead to a later day if the next calendar day is empty', async () => {
      await db.dailyEntries.put({
        id: 'later',
        date: '2026-03-03',
        weightKg: 60.1,
        createdAt: now,
        updatedAt: now,
      })
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            weightKg: 59.65,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      expect(screen.getByText('Night food')).toBeInTheDocument()
      await expect(
        screen.findByText('Next Morning Weight', {}, { timeout: 250 }),
      ).rejects.toThrow()
      expect(screen.queryByText('60.1')).not.toBeInTheDocument()
    })
  })
})
