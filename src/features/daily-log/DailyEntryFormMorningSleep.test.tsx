/** #863 — moved from DailyEntryForm.test.tsx; assertions unchanged. */
import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DailyEntryForm } from './DailyEntryForm'
import {
  now,
  render,
} from './dailyEntryFormTestUtils'

describe('DailyEntryForm', () => {
  describe('sleep', () => {
    it('saves sleep hours and deep sleep independently via its own Save button, entered as hours+minutes (#59/#69)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Hours slept — hours'), '7')
      await user.type(screen.getByLabelText('Hours slept — minutes'), '30')
      await user.type(screen.getByLabelText('Deep sleep — hours'), '2')
      await user.type(screen.getByLabelText('Deep sleep — minutes'), '0')
      await user.click(screen.getByRole('button', { name: 'Save sleep' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].sleepHours).toBe(7.5)
      expect(onSave.mock.calls[0][0].deepSleepHours).toBe(2)
      expect(screen.getByText('7h 30m slept · 2h 0m deep')).toBeInTheDocument()
    })

    it('can be saved with just one of the two fields, the other showing a dash', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Hours slept — hours'), '8')
      await user.click(screen.getByRole('button', { name: 'Save sleep' }))

      expect(onSave.mock.calls[0][0].sleepHours).toBe(8)
      expect(onSave.mock.calls[0][0].deepSleepHours).toBeUndefined()
      expect(screen.getByText('8h 0m slept · — deep')).toBeInTheDocument()
    })

    it('rejects an empty Save and does not persist dashes (#753)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Save sleep' }))

      expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
      expect(
        screen.getByRole('button', { name: 'Save sleep' }),
      ).toBeInTheDocument()
    })

    it('rejects a typed 0 and does not save (#753)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Hours slept — hours'), '0')
      await user.click(screen.getByRole('button', { name: 'Save sleep' }))

      expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('rejects Save after sleep fields are typed then cleared (#753)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      const hours = screen.getByLabelText('Hours slept — hours')
      await user.type(hours, '8')
      await user.clear(hours)
      await user.click(screen.getByRole('button', { name: 'Save sleep' }))

      expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('rejects an out-of-range value and does not save', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Hours slept — hours'), '30')
      await user.click(screen.getByRole('button', { name: 'Save sleep' }))

      expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('shows existing sleep as read-only text with a pencil, editable via a Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            sleepHours: 7,
            deepSleepHours: 1.5,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expect(screen.getByText('7h 0m slept · 1h 30m deep')).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Save sleep' }),
      ).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Edit sleep' }))
      expect(screen.getByLabelText('Hours slept — hours')).toHaveValue('7')
      expect(screen.getByLabelText('Hours slept — minutes')).toHaveValue('0')
      expect(screen.getByLabelText('Deep sleep — hours')).toHaveValue('1')
      expect(screen.getByLabelText('Deep sleep — minutes')).toHaveValue('30')
    })

    it('puts screenshot, edit, and delete on the title row (#752)', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            sleepHours: 7,
            deepSleepHours: 1.5,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      const titleRow = screen.getByText('Sleep').closest('div') as HTMLElement
      expect(
        within(titleRow).getByRole('button', {
          name: 'Fill from AutoSleep screenshot',
        }),
      ).toBeInTheDocument()
      expect(
        within(titleRow).getByRole('button', { name: 'Edit sleep' }),
      ).toBeInTheDocument()
      expect(
        within(titleRow).getByRole('button', { name: 'Delete sleep' }),
      ).toBeInTheDocument()
      expect(
        within(titleRow).queryByText('7h 0m slept · 1h 30m deep'),
      ).not.toBeInTheDocument()
      expect(
        screen.getByText('7h 0m slept · 1h 30m deep'),
      ).toBeInTheDocument()
    })

    it('puts save and cancel on the Sleep title row in edit mode (#858)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            sleepHours: 7,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit sleep' }))
      const titleRow = screen.getByText('Sleep').closest('div') as HTMLElement
      expect(
        within(titleRow).getByRole('button', { name: 'Save sleep' }),
      ).toHaveAttribute('data-size', 'icon-sm')
      expect(
        within(titleRow).getByRole('button', { name: 'Cancel editing sleep' }),
      ).toHaveAttribute('data-size', 'icon-sm')
    })

    describe('leaving edit mode without saving (#424)', () => {
      it('has no Cancel button for a brand-new entry with nothing saved yet', () => {
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        expect(
          screen.queryByRole('button', { name: 'Cancel editing sleep' }),
        ).not.toBeInTheDocument()
      })

      it('discards typed changes to both hours and deep sleep, reverting to the saved values', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              sleepHours: 7,
              deepSleepHours: 1.5,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(screen.getByRole('button', { name: 'Edit sleep' }))
        await user.clear(screen.getByLabelText('Hours slept — hours'))
        await user.type(screen.getByLabelText('Hours slept — hours'), '3')
        await user.click(
          screen.getByRole('button', { name: 'Cancel editing sleep' }),
        )

        expect(onSave).not.toHaveBeenCalled()
        expect(screen.getByText('7h 0m slept · 1h 30m deep')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Edit sleep' }))
        expect(screen.getByLabelText('Hours slept — hours')).toHaveValue('7')
      })
    })
  })

})
