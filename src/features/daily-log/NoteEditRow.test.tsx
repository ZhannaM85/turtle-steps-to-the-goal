import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NoteEditRow } from './NoteEditRow'

describe('NoteEditRow (#850 / #851 / #852 / #854)', () => {
  it('keeps the save and clear controls at a fixed 48px and centers them on the row', () => {
    render(
      <NoteEditRow
        textareaProps={{ 'aria-label': 'Any thoughts?' }}
        saveLabel="Save thoughts"
        onSave={() => {}}
        cancelLabel="Cancel editing thoughts"
        onCancel={() => {}}
      />,
    )

    const textarea = screen.getByRole('textbox', { name: 'Any thoughts?' })
    const save = screen.getByRole('button', { name: 'Save thoughts' })
    const clear = screen.getByRole('button', { name: 'Cancel editing thoughts' })

    expect(textarea).toHaveClass(
      'min-h-12',
      'py-[11px]',
      'leading-6',
      'placeholder:leading-6',
      'placeholder-shown:whitespace-nowrap',
      'content-center',
      'text-base',
      'md:text-base',
    )
    expect(textarea.parentElement).toHaveClass('items-center')
    expect(textarea.parentElement).not.toHaveClass(
      'items-start',
      'items-stretch',
    )
    expect(save).toHaveClass('size-12')
    expect(save).not.toHaveClass('self-stretch', 'h-auto')
    expect(save).toHaveAttribute('data-size', 'icon-xl')
    expect(clear).toHaveClass('size-12')
    expect(clear).not.toHaveClass('self-stretch', 'h-auto')
    expect(clear).toHaveAttribute('data-size', 'icon-xl')
  })

  it('always shows a clear × next to save', async () => {
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

    const clear = screen.getByRole('button', { name: 'Cancel editing note' })
    expect(clear).toHaveAttribute('data-size', 'icon-xl')

    await user.click(clear)
    expect(onSave).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('treats × as delete when a saved value exists (#855)', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onCancel = vi.fn()
    const onDelete = vi.fn()

    render(
      <NoteEditRow
        textareaProps={{ 'aria-label': "Day's note" }}
        saveLabel="Save note"
        onSave={onSave}
        cancelLabel="Cancel editing note"
        onCancel={onCancel}
        hasSavedValue
        deleteLabel="Delete note"
        onDelete={onDelete}
      />,
    )

    const clear = screen.getByRole('button', { name: 'Delete note' })
    expect(
      screen.queryByRole('button', { name: 'Cancel editing note' }),
    ).not.toBeInTheDocument()

    await user.click(clear)
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('disables save when empty or whitespace-only (#854)', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    const { rerender } = render(
      <NoteEditRow
        textareaProps={{ 'aria-label': "Day's note" }}
        saveLabel="Save note"
        onSave={onSave}
        cancelLabel="Cancel editing note"
        onCancel={() => {}}
        saveDisabled
      />,
    )

    expect(screen.getByRole('button', { name: 'Save note' })).toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()

    rerender(
      <NoteEditRow
        textareaProps={{ 'aria-label': "Day's note" }}
        saveLabel="Save note"
        onSave={onSave}
        cancelLabel="Cancel editing note"
        onCancel={() => {}}
        saveDisabled={false}
      />,
    )

    expect(screen.getByRole('button', { name: 'Save note' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Save note' }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('keeps the fixed save control when centering a single-line empty note (#841 / #852)', () => {
    render(
      <NoteEditRow
        textareaProps={{
          'aria-label': "Day's note",
          placeholder: 'How was the day?',
        }}
        saveLabel="Save note"
        onSave={() => {}}
        cancelLabel="Cancel editing note"
        onCancel={() => {}}
      />,
    )

    const textarea = screen.getByRole('textbox', { name: "Day's note" })
    const save = screen.getByRole('button', { name: 'Save note' })

    expect(textarea).toHaveAttribute('placeholder', 'How was the day?')
    expect(textarea).toHaveClass(
      'min-h-12',
      'py-[11px]',
      'leading-6',
      'placeholder:leading-6',
      'placeholder-shown:whitespace-nowrap',
      'content-center',
      'text-base',
      'md:text-base',
    )
    expect(save).toHaveClass('size-12')
    expect(save).toHaveAttribute('data-size', 'icon-xl')
  })

  it('vertically balances a long empty-field placeholder like the morning note (#852)', () => {
    render(
      <NoteEditRow
        textareaProps={{
          'aria-label': 'Morning note',
          placeholder: 'Что-нибудь про ночь или утро?',
        }}
        saveLabel="Save morning note"
        onSave={() => {}}
        cancelLabel="Cancel editing morning note"
        onCancel={() => {}}
      />,
    )

    const textarea = screen.getByRole('textbox', { name: 'Morning note' })
    expect(textarea).toHaveAttribute(
      'placeholder',
      'Что-нибудь про ночь или утро?',
    )
    expect(textarea).toHaveClass(
      'min-h-12',
      'py-[11px]',
      'leading-6',
      'placeholder:leading-6',
      'placeholder-shown:whitespace-nowrap',
      'content-center',
    )
    expect(textarea.style.height).toBe('')
  })
})
