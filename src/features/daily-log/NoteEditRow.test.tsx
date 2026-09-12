import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NoteDisplayBlock, NoteEditRow } from './NoteEditRow'

describe('NoteEditRow (#850 / #851 / #852 / #854 / #858 / #860)', () => {
  it('puts save and clear on the title row so the textarea is full width (#858)', () => {
    render(
      <NoteEditRow
        label="Any thoughts?"
        textareaProps={{ 'aria-label': 'Any thoughts?' }}
        saveLabel="Save thoughts"
        onSave={() => {}}
        cancelLabel="Cancel editing thoughts"
        onCancel={() => {}}
      />,
    )

    const textarea = screen.getByRole('textbox', { name: 'Any thoughts?' })
    const header = screen.getByText('Any thoughts?').closest('div') as HTMLElement
    const save = within(header).getByRole('button', { name: 'Save thoughts' })
    const clear = within(header).getByRole('button', {
      name: 'Cancel editing thoughts',
    })

    expect(header).not.toContainElement(textarea)
    expect(save).toHaveAttribute('data-size', 'icon-sm')
    expect(save).toHaveClass('size-7')
    expect(clear).toHaveAttribute('data-size', 'icon-sm')
    expect(clear).toHaveClass('size-7')
    expect(textarea).toHaveClass(
      'min-h-12',
      'w-full',
      'py-[11px]',
      'leading-6',
      'placeholder:leading-6',
      'placeholder-shown:whitespace-nowrap',
      'content-center',
      'text-base',
      'md:text-base',
    )
  })

  it('always shows a clear × next to save', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onCancel = vi.fn()

    render(
      <NoteEditRow
        label="Day's note"
        textareaProps={{ 'aria-label': "Day's note" }}
        saveLabel="Save note"
        onSave={onSave}
        cancelLabel="Cancel editing note"
        onCancel={onCancel}
      />,
    )

    const clear = screen.getByRole('button', { name: 'Cancel editing note' })
    expect(clear).toHaveAttribute('data-size', 'icon-sm')

    await user.click(clear)
    expect(onSave).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('keeps × as cancel and shows trash when a saved value exists (#860)', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onCancel = vi.fn()
    const onDelete = vi.fn()

    render(
      <NoteEditRow
        label="Day's note"
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

    const clear = screen.getByRole('button', { name: 'Cancel editing note' })
    const trash = screen.getByRole('button', { name: 'Delete note' })

    await user.click(clear)
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onDelete).not.toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()

    await user.click(trash)
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('disables save when empty or whitespace-only (#854)', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    const { rerender } = render(
      <NoteEditRow
        label="Day's note"
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
        label="Day's note"
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

  it('keeps the centered single-line empty note (#841 / #852)', () => {
    render(
      <NoteEditRow
        label="Day's note"
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
  })

  it('vertically balances a long empty-field placeholder like the morning note (#852)', () => {
    render(
      <NoteEditRow
        label="Morning note"
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

  it('puts pencil and trash on the title row in view mode (#858)', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()

    render(
      <NoteDisplayBlock
        label="Day's note"
        text="felt good"
        editLabel="Edit note"
        onEdit={onEdit}
        canDelete
        deleteLabel="Delete note"
        onDelete={onDelete}
      />,
    )

    const header = screen.getByText("Day's note").closest('div') as HTMLElement
    expect(within(header).getByRole('button', { name: 'Edit note' })).toHaveAttribute(
      'data-size',
      'icon-sm',
    )
    expect(
      within(header).getByRole('button', { name: 'Delete note' }),
    ).toHaveAttribute('data-size', 'icon-sm')
    expect(header).not.toHaveTextContent('felt good')
    expect(screen.getByText('felt good')).toBeInTheDocument()
  })
})
