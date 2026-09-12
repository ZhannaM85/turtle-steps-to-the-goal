/** #863 — moved from DailyEntryForm.test.tsx; assertions unchanged. */
import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DailyEntryForm } from './DailyEntryForm'
import {
  expectWeightDisplay,
  now,
  render,
} from './dailyEntryFormTestUtils'

describe('DailyEntryForm', () => {
  describe('weight', () => {
    describe('deleting a weight entry (#670)', () => {
      it('has no Delete button for a brand-new entry with nothing saved yet', () => {
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        expect(
          screen.queryByRole('button', { name: 'Delete weight' }),
        ).not.toBeInTheDocument()
      })

      it('asks for confirmation before deleting, and does nothing on Cancel', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              weightKg: 80,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        const edit = screen.getByRole('button', { name: 'Edit weight' })
        const remove = screen.getByRole('button', { name: 'Delete weight' })
        // #746 — Pencil then Trash, same document order as meals.
        expect(
          edit.compareDocumentPosition(remove) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy()
        // #807 — same tight gap as title ⓘ, not #127's wider control gap.
        expect(edit.parentElement).toHaveClass('gap-1')

        await user.click(remove)
        expect(screen.getByText('Delete this entry?')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Cancel' }))
        expect(onSave).not.toHaveBeenCalled()
        expectWeightDisplay('80')
      })

      it('deletes the weight entry and reopens an empty editable field, without showing NaN', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              weightKg: 80,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(screen.getByRole('button', { name: 'Delete weight' }))
        await user.click(screen.getByRole('button', { name: 'Delete' }))

        expect(onSave).toHaveBeenCalledTimes(1)
        expect(onSave.mock.calls[0][0].weightKg).toBeUndefined()
        expect(screen.getByLabelText('Weight (kg)')).toHaveValue('')
        expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
      })

      it('also offers Delete from the always-editable form (History inline edit)', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              weightKg: 80,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
            alwaysEditable
          />,
        )

        await user.click(screen.getByRole('button', { name: 'Delete weight' }))
        await user.click(screen.getByRole('button', { name: 'Delete' }))

        expect(onSave).toHaveBeenCalledTimes(1)
        expect(onSave.mock.calls[0][0].weightKg).toBeUndefined()
      })

      it("offers Delete right after the first weight save this session, without a remount (#672)", async () => {
        const user = userEvent.setup()
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        expect(
          screen.queryByRole('button', { name: 'Delete weight' }),
        ).not.toBeInTheDocument()

        await user.type(screen.getByLabelText('Weight (kg)'), '80')
        await user.click(screen.getByRole('button', { name: 'Save weight' }))

        expect(
          screen.getByRole('button', { name: 'Delete weight' }),
        ).toBeInTheDocument()
      })

      it('hides Delete again immediately after confirming a delete, without a remount (#673)', async () => {
        const user = userEvent.setup()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              weightKg: 80,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={vi.fn()}
          />,
        )

        await user.click(screen.getByRole('button', { name: 'Delete weight' }))
        await user.click(screen.getByRole('button', { name: 'Delete' }))

        expect(
          screen.queryByRole('button', { name: 'Delete weight' }),
        ).not.toBeInTheDocument()
        expect(
          screen.queryByRole('button', { name: 'Cancel editing weight' }),
        ).not.toBeInTheDocument()
      })
    })

    describe('deleting sleep / body measurements / body composition (#745)', () => {
      it('has no Delete sleep button when nothing is saved', () => {
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )
        expect(
          screen.queryByRole('button', { name: 'Delete sleep' }),
        ).not.toBeInTheDocument()
      })

      it('asks before deleting sleep, and Cancel keeps the values', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              sleepHours: 8,
              deepSleepHours: 2,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        const edit = screen.getByRole('button', { name: 'Edit sleep' })
        const remove = screen.getByRole('button', { name: 'Delete sleep' })
        expect(
          edit.compareDocumentPosition(remove) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy()

        await user.click(remove)
        expect(screen.getByText('Delete this entry?')).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Cancel' }))
        expect(onSave).not.toHaveBeenCalled()
        expect(screen.getByText(/8h 0m slept/)).toBeInTheDocument()
      })

      it('clears sleep and deep sleep on confirm', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              sleepHours: 8,
              deepSleepHours: 2,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(screen.getByRole('button', { name: 'Delete sleep' }))
        await user.click(screen.getByRole('button', { name: 'Delete' }))

        expect(onSave).toHaveBeenCalledTimes(1)
        expect(onSave.mock.calls[0][0].sleepHours).toBeUndefined()
        expect(onSave.mock.calls[0][0].deepSleepHours).toBeUndefined()
        expect(
          screen.queryByRole('button', { name: 'Delete sleep' }),
        ).not.toBeInTheDocument()
      })

      it('clears body measurements on confirm', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              waistCm: 70,
              hipCm: 95,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(
          screen.getByRole('button', { name: 'Delete body measurements' }),
        )
        await user.click(screen.getByRole('button', { name: 'Delete' }))

        expect(onSave.mock.calls[0][0].waistCm).toBeUndefined()
        expect(onSave.mock.calls[0][0].hipCm).toBeUndefined()
      })

      it('clears all body composition fields on confirm', async () => {
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
              bodyFatPercent: 32,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(
          screen.getByRole('button', { name: 'Delete body composition' }),
        )
        await user.click(screen.getByRole('button', { name: 'Delete' }))

        const saved = onSave.mock.calls[0][0]
        expect(saved.muscleMassKg).toBeUndefined()
        expect(saved.visceralFatRating).toBeUndefined()
        expect(saved.bodyWaterPercent).toBeUndefined()
        expect(saved.boneMassKg).toBeUndefined()
        expect(saved.bodyFatPercent).toBeUndefined()
      })
    })

    describe('leaving edit mode without saving (#424)', () => {
      it('has no Cancel button for a brand-new entry with nothing saved yet', () => {
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        expect(
          screen.queryByRole('button', { name: 'Cancel editing weight' }),
        ).not.toBeInTheDocument()
      })

      it('discards a typed change and reverts to the saved value', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              weightKg: 80,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(screen.getByRole('button', { name: 'Edit weight' }))
        const input = screen.getByLabelText('Weight (kg)')
        await user.clear(input)
        await user.type(input, '999')
        await user.click(
          screen.getByRole('button', { name: 'Cancel editing weight' }),
        )

        expect(onSave).not.toHaveBeenCalled()
        expectWeightDisplay('80')
        expect(
          screen.queryByLabelText('Weight (kg)'),
        ).not.toBeInTheDocument()
      })
    })
  })
})
