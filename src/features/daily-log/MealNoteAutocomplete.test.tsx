import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MealItem } from '@/domain/mealItem'
import { MealNoteAutocomplete } from './MealNoteAutocomplete'

/** MealNoteAutocomplete is a controlled input — a stub onChange leaves
 * `value` frozen, so filtering-while-typing needs a real controlled
 * wrapper, not just a userEvent.type() call against a static prop. */
function ControlledAutocomplete(props: {
  suggestions: MealItem[]
  onSubmit?: () => void
}) {
  const [value, setValue] = useState('')
  return (
    <MealNoteAutocomplete
      value={value}
      onChange={setValue}
      onSubmit={props.onSubmit ?? vi.fn()}
      suggestions={props.suggestions}
      ariaLabel="Meal note"
      placeholder="Add a dish?"
      listInputId="note"
    />
  )
}

function mealItem(name: string): MealItem {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('MealNoteAutocomplete (#86)', () => {
  it('stays closed on focus alone, even with suggestions available (#184)', async () => {
    const user = userEvent.setup()
    render(
      <MealNoteAutocomplete
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        suggestions={[mealItem('Pizza'), mealItem('Salad')]}
        ariaLabel="Meal note"
        placeholder="Add a dish?"
        listInputId="note"
      />,
    )

    await user.click(screen.getByLabelText('Meal note'))

    expect(screen.queryByRole('button', { name: 'Pizza' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salad' })).not.toBeInTheDocument()
  })

  it('opens and shows every suggestion once typing starts (#184)', async () => {
    const user = userEvent.setup()
    render(
      <ControlledAutocomplete
        suggestions={[mealItem('Pizza'), mealItem('Salad')]}
      />,
    )

    await user.type(screen.getByLabelText('Meal note'), 'a')

    expect(screen.getByRole('button', { name: 'Pizza' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salad' })).toBeInTheDocument()
  })

  it('filters suggestions as the user types', async () => {
    const user = userEvent.setup()
    render(
      <ControlledAutocomplete
        suggestions={[mealItem('Pizza'), mealItem('Salad')]}
      />,
    )

    await user.type(screen.getByLabelText('Meal note'), 'piz')

    expect(screen.getByRole('button', { name: 'Pizza' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Salad' }),
    ).not.toBeInTheDocument()
  })

  it('fills the input and closes the dropdown when a suggestion is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <MealNoteAutocomplete
        value=""
        onChange={onChange}
        onSubmit={vi.fn()}
        suggestions={[mealItem('Pizza')]}
        ariaLabel="Meal note"
        placeholder="Add a dish?"
        listInputId="note"
      />,
    )

    await user.type(screen.getByLabelText('Meal note'), 'p')
    await user.click(screen.getByRole('button', { name: 'Pizza' }))

    expect(onChange).toHaveBeenCalledWith('Pizza')
    expect(screen.queryByRole('button', { name: 'Pizza' })).not.toBeInTheDocument()
  })

  it('calls onSubmit on Enter instead of inserting a newline', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <MealNoteAutocomplete
        value="Pizza"
        onChange={vi.fn()}
        onSubmit={onSubmit}
        suggestions={[]}
        ariaLabel="Meal note"
        placeholder="Add a dish?"
        listInputId="note"
      />,
    )

    await user.click(screen.getByLabelText('Meal note'))
    await user.keyboard('{Enter}')

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
