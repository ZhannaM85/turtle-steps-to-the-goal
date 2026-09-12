/** #863 — moved from DailyEntryForm.test.tsx; assertions unchanged. */
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/infrastructure/persistence/indexeddb'
import { DailyEntryForm } from './DailyEntryForm'
import {
  expectBodyCompositionValues,
  now,
  render,
} from './dailyEntryFormTestUtils'

describe('DailyEntryForm', () => {
  describe('body composition (#233)', () => {
    describe('leaving edit mode without saving (#424)', () => {
      afterEach(async () => {
        await db.dailyEntries.clear()
      })

      it('has no Cancel button for a brand-new entry with nothing saved yet', () => {
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        expect(
          screen.queryByRole('button', {
            name: 'Cancel editing body composition',
          }),
        ).not.toBeInTheDocument()
      })

      it('discards typed changes to all 5 fields, reverting to the saved values', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              muscleMassKg: 30,
              visceralFatRating: 5,
              bodyWaterPercent: 48,
              boneMassKg: 2.3,
              bodyFatPercent: 22,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(
          screen.getByRole('button', { name: 'Edit body composition' }),
        )
        const muscleInput = screen.getByLabelText('Muscle mass (kg)')
        await user.clear(muscleInput)
        await user.type(muscleInput, '90')
        await user.click(
          screen.getByRole('button', {
            name: 'Cancel editing body composition',
          }),
        )

        expect(onSave).not.toHaveBeenCalled()
        expectBodyCompositionValues(['30kg', '5', '48%', '2.3kg', '22%'])
      })

      it('also dismisses any pending unusual-value warning', async () => {
        // A previous day's entry so there's a #401 delta baseline, and an
        // existing today's entry so the Cancel button actually renders
        // (nothing established for today = nothing to cancel back to).
        await db.dailyEntries.put({
          id: 'prev-1',
          date: '2026-02-28',
          muscleMassKg: 30,
          createdAt: now,
          updatedAt: now,
        })
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              muscleMassKg: 30,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(
          screen.getByRole('button', { name: 'Edit body composition' }),
        )
        const muscleInput = screen.getByLabelText('Muscle mass (kg)')
        await user.clear(muscleInput)
        // 35kg on its own is a perfectly ordinary muscle mass -- only the
        // 5kg jump from yesterday's 30kg (#401) makes this unusual.
        await user.type(muscleInput, '35')
        await user.click(
          screen.getByRole('button', { name: 'Save body composition' }),
        )
        expect(await screen.findByText(/unusual change/)).toBeInTheDocument()

        await user.click(
          screen.getByRole('button', {
            name: 'Cancel editing body composition',
          }),
        )

        expect(onSave).not.toHaveBeenCalled()
        expect(screen.queryByText(/unusual change/)).not.toBeInTheDocument()
        expectBodyCompositionValues(['30kg'])
      })
    })

    describe('unusual jump vs. yesterday (#401)', () => {
      afterEach(async () => {
        await db.dailyEntries.clear()
      })

      it('warns when a body composition field jumps unusually from yesterday, saves anyway on confirm', async () => {
        await db.dailyEntries.put({
          id: 'prev-1',
          date: '2026-02-28',
          muscleMassKg: 30,
          createdAt: now,
          updatedAt: now,
        })
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={null}
            onSave={onSave}
          />,
        )

        // 35kg on its own is a perfectly ordinary muscle mass — only the
        // 5kg jump from yesterday's 30kg makes this unusual.
        await user.type(screen.getByLabelText('Muscle mass (kg)'), '35')
        await user.click(
          screen.getByRole('button', { name: 'Save body composition' }),
        )

        expect(
          await screen.findByText(/unusual change/),
        ).toBeInTheDocument()
        expect(onSave).not.toHaveBeenCalled()

        await user.click(
          screen.getByRole('button', { name: 'Save anyway' }),
        )
        expect(onSave).toHaveBeenCalledTimes(1)
        expect(onSave.mock.calls[0][0].muscleMassKg).toBe(35)
      })

      it('does not warn for an ordinary day-to-day body composition change', async () => {
        await db.dailyEntries.put({
          id: 'prev-2',
          date: '2026-02-28',
          muscleMassKg: 30,
          createdAt: now,
          updatedAt: now,
        })
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={null}
            onSave={onSave}
          />,
        )

        await user.type(screen.getByLabelText('Muscle mass (kg)'), '30.1')
        await user.click(
          screen.getByRole('button', { name: 'Save body composition' }),
        )

        expect(onSave).toHaveBeenCalledTimes(1)
        expect(screen.queryByText(/unusual change/)).not.toBeInTheDocument()
      })
    })

    it('does not persist an invalid, never-saved draft when a different field is saved (#447)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      // Type a far-out-of-range value into Body composition, but never
      // click its own Save button (or trigger the #435 on-blur error path
      // by leaving the field, matching the reported live scenario).
      await user.type(screen.getByLabelText('Muscle mass (kg)'), '58888')

      // Save a completely different field instead.
      await user.type(screen.getByLabelText('Weight (kg)'), '60')
      await user.click(screen.getByRole('button', { name: 'Save weight' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].weightKg).toBe(60)
      // The invalid, never-validated muscle mass draft must not ride
      // along -- nothing was ever successfully saved for it, so it stays
      // unset rather than persisting the still-invalid 58888 draft.
      expect(onSave.mock.calls[0][0].muscleMassKg).toBeUndefined()
    })
  })
})
