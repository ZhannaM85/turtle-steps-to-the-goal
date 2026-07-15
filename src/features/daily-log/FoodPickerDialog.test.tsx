import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FoodPickerDialog } from './FoodPickerDialog'

describe('FoodPickerDialog', () => {
  it('renders nothing when closed', () => {
    render(<FoodPickerDialog open={false} onOpenChange={vi.fn()} onAdd={vi.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('filters the food list as the user types', async () => {
    const user = userEvent.setup()
    render(<FoodPickerDialog open onOpenChange={vi.fn()} onAdd={vi.fn()} />)

    expect(screen.getByText('Salmon')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Search foods'), 'chicken')

    expect(screen.getByText('Chicken breast')).toBeInTheDocument()
    expect(screen.getByText('Chicken thigh')).toBeInTheDocument()
    expect(screen.queryByText('Salmon')).not.toBeInTheDocument()
  })

  it('shows a no-results message when nothing matches', async () => {
    const user = userEvent.setup()
    render(<FoodPickerDialog open onOpenChange={vi.fn()} onAdd={vi.fn()} />)

    await user.type(screen.getByLabelText('Search foods'), 'zzzznotfood')

    expect(screen.getByText('No foods found.')).toBeInTheDocument()
  })

  it('the Add button stays disabled until a food is picked', async () => {
    const user = userEvent.setup()
    render(<FoodPickerDialog open onOpenChange={vi.fn()} onAdd={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Add food' })).toBeDisabled()

    await user.click(screen.getByText('Chicken breast'))

    expect(screen.getByRole('button', { name: 'Add food' })).toBeEnabled()
  })

  it('scales the picked food by quantity and hands back computed macros', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    const onOpenChange = vi.fn()
    render(<FoodPickerDialog open onOpenChange={onOpenChange} onAdd={onAdd} />)

    await user.click(screen.getByText('Chicken breast'))
    const quantityInput = screen.getByLabelText('Quantity (g)')
    await user.clear(quantityInput)
    await user.type(quantityInput, '150')
    await user.click(screen.getByRole('button', { name: 'Add food' }))

    expect(onAdd).toHaveBeenCalledWith({
      amountKcal: 248, // 165 kcal/100g * 1.5
      proteinG: 46.5, // 31g/100g * 1.5
      fatG: 5.4, // 3.6g/100g * 1.5
      carbsG: 0,
      note: 'Chicken breast',
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('defaults quantity to 100g', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<FoodPickerDialog open onOpenChange={vi.fn()} onAdd={onAdd} />)

    await user.click(screen.getByText('Salmon'))
    expect(screen.getByLabelText('Quantity (g)')).toHaveValue('100')

    await user.click(screen.getByRole('button', { name: 'Add food' }))

    expect(onAdd).toHaveBeenCalledWith({
      amountKcal: 208,
      proteinG: 20,
      fatG: 13,
      carbsG: 0,
      note: 'Salmon',
    })
  })
})
