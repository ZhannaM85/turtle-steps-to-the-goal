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
  describe('note', () => {
    it('saves a new note independently via its own Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText("Day's note"), 'felt good')
      await user.click(screen.getByRole('button', { name: 'Save note' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].note).toBe('felt good')
      expect(screen.getByText('felt good')).toBeInTheDocument()
    })

    it('does not save an empty or whitespace-only note (#854)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      const save = screen.getByRole('button', { name: 'Save note' })
      expect(save).toBeDisabled()
      expect(onSave).not.toHaveBeenCalled()

      await user.type(screen.getByLabelText("Day's note"), '   ')
      expect(save).toBeDisabled()
      expect(onSave).not.toHaveBeenCalled()
      expect(screen.getByLabelText("Day's note")).toBeInTheDocument()
    })

    it('keeps × able to restore a saved note after the field is cleared (#854 / #855)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            note: 'felt good',
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit note' }))
      await user.clear(screen.getByLabelText("Day's note"))
      expect(screen.getByRole('button', { name: 'Save note' })).toBeDisabled()
      await user.click(
        screen.getByRole('button', { name: 'Cancel editing note' }),
      )

      expect(onSave).not.toHaveBeenCalled()
      expect(screen.getByText('felt good')).toBeInTheDocument()
    })

    it('shows an existing note as read-only text with a pencil, editable via a Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            note: 'felt good',
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expect(screen.getByText('felt good')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Edit note' }))
      const input = screen.getByLabelText("Day's note")
      await user.clear(input)
      await user.type(input, 'updated note')
      await user.click(screen.getByRole('button', { name: 'Save note' }))

      expect(onSave.mock.calls[0][0].note).toBe('updated note')
      expect(screen.getByText('updated note')).toBeInTheDocument()
    })

    it('lets Enter insert a newline in the note field instead of saving it (#417)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      const input = screen.getByLabelText("Day's note")
      await user.type(input, 'line one{Enter}line two')

      expect(onSave).not.toHaveBeenCalled()
      expect(input).toHaveValue('line one\nline two')
    })

    describe('leaving edit mode without saving (#437 / #850)', () => {
      it('shows a clear × on a brand-new note that empties the draft without leaving edit', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
        )

        const input = screen.getByLabelText("Day's note")
        await user.type(input, 'draft I do not want')
        await user.click(
          screen.getByRole('button', { name: 'Cancel editing note' }),
        )

        expect(onSave).not.toHaveBeenCalled()
        expect(input).toHaveValue('')
        expect(screen.getByLabelText("Day's note")).toBeInTheDocument()
      })

      it('discards a typed change and reverts to the saved note', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              note: 'felt good',
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(screen.getByRole('button', { name: 'Edit note' }))
        const input = screen.getByLabelText("Day's note")
        await user.clear(input)
        await user.type(input, 'a change I want to discard')
        await user.click(
          screen.getByRole('button', { name: 'Cancel editing note' }),
        )

        expect(onSave).not.toHaveBeenCalled()
        expect(screen.getByText('felt good')).toBeInTheDocument()
        expect(
          screen.queryByLabelText("Day's note"),
        ).not.toBeInTheDocument()
      })
    })

    describe('deleting a saved note (#855)', () => {
      it('asks for confirmation before deleting, and does nothing on Cancel', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              note: 'felt good',
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(screen.getByRole('button', { name: 'Delete note' }))
        expect(screen.getByText('Delete this entry?')).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(onSave).not.toHaveBeenCalled()
        expect(screen.getByText('felt good')).toBeInTheDocument()
      })

      it('clears the saved note on confirm and reopens an empty editor', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              note: 'felt good',
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(screen.getByRole('button', { name: 'Delete note' }))
        await user.click(screen.getByRole('button', { name: 'Delete' }))

        expect(onSave).toHaveBeenCalledTimes(1)
        expect(onSave.mock.calls[0][0].note).toBeUndefined()
        expect(screen.getByLabelText("Day's note")).toHaveValue('')
      })
    })

    it('lets the note display card grow to fit a long, wrapped note instead of clipping it (#189)', () => {
      const longNote =
        'Пытаюсь в кето-диету. Сегодня было 111 грамм белка, 43 грамма углеводов, 36 грамм жира.'
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            note: longNote,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      // The card used to be a fixed h-12 — too short for a note that wraps
      // to multiple lines, so the mood icon/edit button (vertically
      // centered against that fixed height) overlapped the wrapped text.
      // min-h-12 keeps the same look for a short note but lets the card
      // grow for a long one.
      const card = screen.getByText(longNote).closest('div')
      expect(card).toHaveClass('min-h-12')
      expect(card).not.toHaveClass('h-12')
    })

    it('saves the note independently of mood (#44)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText("Day's note"), 'felt good')
      await user.click(screen.getByRole('button', { name: 'Save note' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].note).toBe('felt good')
    })
  })

})
