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
  describe('morning note (#763)', () => {
    it('saves a new morning note independently via its own Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(
        screen.getByLabelText('Morning note'),
        'night snack, regretting it',
      )
      await user.click(
        screen.getByRole('button', { name: 'Save morning note' }),
      )

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].morningNote).toBe(
        'night snack, regretting it',
      )
      expect(screen.getByText('night snack, regretting it')).toBeInTheDocument()
    })

    it('shows an existing morning note as read-only text with a pencil', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            morningNote: 'woke up heavy',
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expect(screen.getByText('woke up heavy')).toBeInTheDocument()
      await user.click(
        screen.getByRole('button', { name: 'Edit morning note' }),
      )
      const input = screen.getByLabelText('Morning note')
      await user.clear(input)
      await user.type(input, 'updated morning')
      await user.click(
        screen.getByRole('button', { name: 'Save morning note' }),
      )

      expect(onSave.mock.calls[0][0].morningNote).toBe('updated morning')
      expect(screen.getByText('updated morning')).toBeInTheDocument()
    })

    it('lets Enter insert a newline instead of saving', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      const input = screen.getByLabelText('Morning note')
      await user.type(input, 'line one{Enter}line two')

      expect(onSave).not.toHaveBeenCalled()
      expect(input).toHaveValue('line one\nline two')
    })

    it('discards a typed change and reverts to the saved morning note', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            morningNote: 'woke up heavy',
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

        await user.click(
          screen.getByRole('button', { name: 'Edit morning note' }),
        )
        const input = screen.getByLabelText('Morning note')
        await user.clear(input)
        await user.type(input, 'a change I want to discard')
        await user.click(
          screen.getByRole('button', { name: 'Cancel editing morning note' }),
        )

        expect(onSave).not.toHaveBeenCalled()
        expect(screen.getByText('woke up heavy')).toBeInTheDocument()
        expect(screen.queryByLabelText('Morning note')).not.toBeInTheDocument()
      })

      it('deletes a saved morning note after confirm (#855)', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              morningNote: 'woke up heavy',
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(
          screen.getByRole('button', { name: 'Delete morning note' }),
        )
        await user.click(screen.getByRole('button', { name: 'Delete' }))

        expect(onSave).toHaveBeenCalledTimes(1)
        expect(onSave.mock.calls[0][0].morningNote).toBeUndefined()
        expect(screen.getByLabelText('Morning note')).toHaveValue('')
      })

    it('dismisses an empty morning note on × and keeps the heading and pencil (#1080)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      const view = render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      const input = screen.getByLabelText('Morning note')
      await user.type(input, '   ')
      await user.click(
        screen.getByRole('button', { name: 'Cancel editing morning note' }),
      )

      expect(onSave).not.toHaveBeenCalled()
      expect(screen.queryByText('   ')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('textbox', { name: 'Morning note' }),
      ).not.toBeInTheDocument()
      expect(screen.getByText('Morning note')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Edit morning note' }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Delete morning note' }),
      ).not.toBeInTheDocument()
      const block = screen.getByText('Morning note').closest('div')
        ?.parentElement
      expect(block?.querySelector('.bg-muted')).toBeNull()

      await user.click(
        screen.getByRole('button', { name: 'Edit morning note' }),
      )
      const reopened = screen.getByLabelText('Morning note')
      expect(reopened).toHaveValue('')
      await user.type(reopened, 'draft')
      await user.click(
        screen.getByRole('button', { name: 'Cancel editing morning note' }),
      )
      expect(onSave).not.toHaveBeenCalled()
      expect(screen.queryByText('draft')).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Edit morning note' }),
      ).toBeInTheDocument()

      view.unmount()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )
      expect(
        screen.queryByRole('textbox', { name: 'Morning note' }),
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Edit morning note' }),
      ).toBeInTheDocument()
    })

    it('does not save an empty or whitespace-only morning note (#854)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      const save = screen.getByRole('button', { name: 'Save morning note' })
      expect(save).toBeDisabled()
      await user.type(screen.getByLabelText('Morning note'), '   ')
      expect(save).toBeDisabled()
      expect(onSave).not.toHaveBeenCalled()
    })
  })

})
