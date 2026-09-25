import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MealTypePicker } from './MealTypePicker'

const OPTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Night food']

function Controlled({
  initial = 'Breakfast',
  onChange,
}: {
  initial?: string
  onChange?: (value: string) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <MealTypePicker
      value={value}
      options={OPTIONS}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

describe('MealTypePicker (#1001)', () => {
  it('shows the current choice closed and lists the same options when opened', async () => {
    const user = userEvent.setup()
    render(<Controlled />)

    const trigger = screen.getByRole('button', { name: 'Meal type' })
    expect(trigger).toHaveTextContent('Breakfast')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('option', { name: 'Lunch' })).not.toBeInTheDocument()

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    for (const name of OPTIONS) {
      expect(screen.getByRole('option', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('option', { name: 'Breakfast' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('option', { name: 'Lunch' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('sets the meal name from a choice and closes the list', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Meal type' }))
    await user.click(screen.getByRole('option', { name: 'Lunch' }))

    expect(onChange).toHaveBeenCalledWith('Lunch')
    const trigger = screen.getByRole('button', { name: 'Meal type' })
    expect(trigger).toHaveTextContent('Lunch')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('option', { name: 'Lunch' })).not.toBeInTheDocument()
  })

  it('shows Not selected when the name is cleared', () => {
    render(<MealTypePicker value="" options={OPTIONS} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Meal type' })).toHaveTextContent(
      'Not selected',
    )
  })
})
