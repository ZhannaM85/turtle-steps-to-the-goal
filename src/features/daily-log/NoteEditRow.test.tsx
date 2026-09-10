import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NoteEditRow } from './NoteEditRow'

describe('NoteEditRow (#840)', () => {
  it('matches the textarea and save button at the 48px floor and stretches together', () => {
    render(
      <NoteEditRow
        textareaProps={{ 'aria-label': 'Any thoughts?' }}
        saveLabel="Save thoughts"
        onSave={() => {}}
      />,
    )

    const textarea = screen.getByRole('textbox', { name: 'Any thoughts?' })
    const save = screen.getByRole('button', { name: 'Save thoughts' })

    expect(textarea).toHaveClass('min-h-12', 'py-[11px]', 'leading-6')
    expect(textarea.parentElement).toHaveClass('items-stretch')
    expect(save).toHaveClass('h-auto', 'min-h-12', 'w-12', 'self-stretch')
    expect(save).toHaveAttribute('data-size', 'icon-stretch')
    expect(
      screen.queryByRole('button', { name: 'Cancel' }),
    ).not.toBeInTheDocument()
  })

  it('shows a matching cancel control when provided', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onCancel = vi.fn()

    render(
      <NoteEditRow
        textareaProps={{ 'aria-label': "Day's note" }}
        saveLabel="Save note"
        onSave={onSave}
        cancelLabel="Cancel editing note"
        onCancel={onCancel}
      />,
    )

    const cancel = screen.getByRole('button', { name: 'Cancel editing note' })
    expect(cancel).toHaveClass('h-auto', 'min-h-12', 'w-12', 'self-stretch')
    expect(cancel).toHaveAttribute('data-size', 'icon-stretch')

    await user.click(screen.getByRole('button', { name: 'Save note' }))
    await user.click(cancel)
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('keeps the stretch save control when centering a single-line empty note (#841)', () => {
    render(
      <NoteEditRow
        textareaProps={{
          'aria-label': "Day's note",
          placeholder: 'How was the day?',
        }}
        saveLabel="Save note"
        onSave={() => {}}
      />,
    )

    const textarea = screen.getByRole('textbox', { name: "Day's note" })
    const save = screen.getByRole('button', { name: 'Save note' })

    expect(textarea).toHaveAttribute('placeholder', 'How was the day?')
    expect(textarea).toHaveClass('min-h-12', 'py-[11px]', 'leading-6')
    expect(save).toHaveClass('h-auto', 'min-h-12', 'w-12', 'self-stretch')
    expect(save).toHaveAttribute('data-size', 'icon-stretch')
  })
})
