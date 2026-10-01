import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { AddMealNoteField } from './AddMealNoteField'

function ControlledNote({
  mealLabel,
  initialNote = '',
  collapseUntilPencil = false,
}: {
  mealLabel: string
  initialNote?: string
  collapseUntilPencil?: boolean
}) {
  const [note, setNote] = useState(initialNote)
  return (
    <AddMealNoteField
      mealLabel={mealLabel}
      note={note}
      onNoteChange={setNote}
      collapseUntilPencil={collapseUntilPencil}
    />
  )
}

describe('AddMealNoteField (#1059)', () => {
  afterEach(() => {
    useLocaleStore.setState({ locale: 'en' })
  })

  it('keeps a non-night note field open when it is empty', () => {
    render(<ControlledNote mealLabel="Breakfast" />)

    expect(screen.getByLabelText('Meal note')).toHaveAttribute(
      'placeholder',
      'Note about breakfast',
    )
    expect(screen.queryByRole('button', { name: 'Note about night food' })).not.toBeInTheDocument()
  })

  it('opens an empty night-food note with day-note save and cancel (#1063)', async () => {
    const user = userEvent.setup()
    render(<ControlledNote mealLabel="Night food" />)

    expect(screen.queryByRole('textbox', { name: 'Note about night food' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Note about night food' }))

    const note = screen.getByRole('textbox', { name: 'Note about night food' })
    expect(note).toHaveAttribute('placeholder', 'Note about night food')
    expect(note).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Save note' })).toBeDisabled()

    await user.type(note, 'tea')
    expect(note).toHaveValue('tea')
    await user.click(screen.getByRole('button', { name: 'Cancel editing note' }))

    expect(screen.queryByRole('textbox', { name: 'Note about night food' })).not.toBeInTheDocument()
    expect(screen.queryByText('tea')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Note about night food' })).toBeInTheDocument()
  })

  it('saves a night-food note and reverts an edit to the last saved text (#1063)', async () => {
    const user = userEvent.setup()
    render(<ControlledNote mealLabel="Night food" />)

    await user.click(screen.getByRole('button', { name: 'Note about night food' }))
    await user.type(screen.getByRole('textbox', { name: 'Note about night food' }), 'tea')
    await user.click(screen.getByRole('button', { name: 'Save note' }))

    expect(screen.getByText('tea')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Note about night food' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit note' }))
    const note = screen.getByRole('textbox', { name: 'Note about night food' })
    await user.clear(note)
    await user.type(note, 'water')
    await user.click(screen.getByRole('button', { name: 'Cancel editing note' }))

    expect(screen.getByText('tea')).toBeInTheDocument()
    expect(screen.queryByText('water')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Note about night food' })).not.toBeInTheDocument()
  })

  it('shows a saved night-food note, and delete collapses it to the pencil', async () => {
    const user = userEvent.setup()
    render(<ControlledNote mealLabel="Night food" initialNote="already written" />)

    expect(screen.getByText('already written')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Note about night food' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Note about night food' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete note' }))
    expect(screen.getByText('Delete this note?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(screen.queryByText('already written')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Note about night food' })).toBeInTheDocument()
  })

  it('keeps an edited meal note collapsed until the pencil (#1064)', async () => {
    const user = userEvent.setup()
    render(
      <ControlledNote
        mealLabel="Dinner"
        initialNote="already written"
        collapseUntilPencil
      />,
    )

    expect(
      screen.queryByRole('textbox', { name: 'Note about dinner' }),
    ).not.toBeInTheDocument()
    expect(document.activeElement).not.toBeInstanceOf(HTMLTextAreaElement)
    expect(screen.getByText('already written')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit note' }))
    const note = screen.getByRole('textbox', { name: 'Note about dinner' })
    expect(note).toHaveFocus()
    expect(note).toHaveValue('already written')
  })

  it('uses «Заметка о ночной еде» for the Russian night-food note', async () => {
    useLocaleStore.setState({ locale: 'ru' })
    const user = userEvent.setup()
    render(<ControlledNote mealLabel="Ночная еда" />)

    await user.click(screen.getByRole('button', { name: 'Заметка о ночной еде' }))
    expect(screen.getByRole('textbox', { name: 'Заметка о ночной еде' })).toHaveAttribute(
      'placeholder',
      'Заметка о ночной еде',
    )
  })
})
