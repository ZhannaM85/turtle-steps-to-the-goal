/** #863 — moved from DailyEntryForm.test.tsx; assertions unchanged. */
import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DailyEntryForm } from './DailyEntryForm'
import {
  now,
  render,
} from './dailyEntryFormTestUtils'

describe('DailyEntryForm', () => {
  describe('body measurements (#225)', () => {
    it('saves waist/hip together via one Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Waist (cm)'), '80')
      await user.type(screen.getByLabelText('Hip (cm)'), '95')
      await user.click(
        screen.getByRole('button', { name: 'Save body measurements' }),
      )

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].waistCm).toBe(80)
      expect(onSave.mock.calls[0][0].hipCm).toBe(95)
      expect(screen.getByText('Waist 80cm · Hip 95cm')).toBeInTheDocument()
    })

    it('rejects an empty Save and does not persist dashes (#854)', async () => {
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
        screen.getByRole('button', { name: 'Save body measurements' }),
      )

      expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
      expect(
        screen.getByRole('button', { name: 'Save body measurements' }),
      ).toBeInTheDocument()
    })

    it('rejects an out-of-range waist value and does not save', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Waist (cm)'), '5')
      await user.click(
        screen.getByRole('button', { name: 'Save body measurements' }),
      )

      expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('shows existing body measurements as read-only text with a pencil, editable via a Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            waistCm: 80,
            hipCm: 95,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expect(screen.getByText('Waist 80cm · Hip 95cm')).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Save body measurements' }),
      ).not.toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Edit body measurements' }),
      )
      const waistInput = screen.getByLabelText('Waist (cm)')
      expect(waistInput).toHaveValue('80')
      await user.clear(waistInput)
      await user.type(waistInput, '78')
      await user.click(
        screen.getByRole('button', { name: 'Save body measurements' }),
      )

      expect(onSave.mock.calls[0][0].waistCm).toBe(78)
      expect(screen.getByText('Waist 78cm · Hip 95cm')).toBeInTheDocument()
    })

    describe('leaving edit mode without saving (#424)', () => {
      it('has no Cancel button for a brand-new entry with nothing saved yet', () => {
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        expect(
          screen.queryByRole('button', {
            name: 'Cancel editing body measurements',
          }),
        ).not.toBeInTheDocument()
      })

      it('discards typed changes to both waist and hip, reverting to the saved values', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              waistCm: 80,
              hipCm: 95,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(
          screen.getByRole('button', { name: 'Edit body measurements' }),
        )
        const waistInput = screen.getByLabelText('Waist (cm)')
        await user.clear(waistInput)
        await user.type(waistInput, '150')
        await user.click(
          screen.getByRole('button', {
            name: 'Cancel editing body measurements',
          }),
        )

        expect(onSave).not.toHaveBeenCalled()
        expect(screen.getByText('Waist 80cm · Hip 95cm')).toBeInTheDocument()
      })
    })
  })

})
