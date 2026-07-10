import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NumberInput } from './number-input'

describe('NumberInput', () => {
  it('renders a number input associated with its label', () => {
    render(<NumberInput label="Weight" />)
    const input = screen.getByLabelText('Weight')
    expect(input).toHaveAttribute('type', 'number')
  })

  it('displays the unit suffix', () => {
    render(<NumberInput label="Weight" unit="kg" />)
    expect(screen.getByText('kg')).toBeInTheDocument()
  })

  it('links the error message via aria-describedby and aria-invalid', () => {
    render(<NumberInput label="Weight" error="Enter a realistic weight" />)
    const input = screen.getByLabelText('Weight')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(screen.getByText('Enter a realistic weight')).toHaveAttribute(
      'id',
      describedBy,
    )
  })
})
