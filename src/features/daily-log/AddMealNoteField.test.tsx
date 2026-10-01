import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { AddMealNoteField } from './AddMealNoteField'

function ControlledNote({
  mealLabel,
  initialNote = '',
}: {
  mealLabel: string
  initialNote?: string
}) {
  const [note, setNote] = useState(initialNote)
  return (
    <AddMealNoteField
      mealLabel={mealLabel}
      note={note}
      onNoteChange={setNote}
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

  it('hides an empty night-food note behind a pencil, then opens it', async () => {
    const user = userEvent.setup()
    render(<ControlledNote mealLabel="Night food" />)

    expect(screen.queryByRole('textbox', { name: 'Note about night food' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Note about night food' }))

    const note = screen.getByRole('textbox', { name: 'Note about night food' })
    expect(note).toHaveAttribute('placeholder', 'Note about night food')
    expect(note).toHaveFocus()
    await user.type(note, 'tea')
    expect(note).toHaveValue('tea')
  })

  it('keeps a filled night-food note open', () => {
    render(<ControlledNote mealLabel="Night food" initialNote="already written" />)

    expect(screen.getByRole('textbox', { name: 'Note about night food' })).toHaveValue(
      'already written',
    )
    expect(
      screen.queryByRole('button', { name: 'Note about night food' }),
    ).not.toBeInTheDocument()
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
