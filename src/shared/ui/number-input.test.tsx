import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NumberInput } from './number-input'

describe('NumberInput', () => {
  it('renders a decimal-mode text input associated with its label', () => {
    render(<NumberInput label="Weight" />)
    const input = screen.getByLabelText('Weight')
    // type="text" (not "number") so a comma decimal separator isn't silently
    // rejected by the browser on mobile/non-US locales; inputMode="decimal"
    // still surfaces the right on-screen keyboard.
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveAttribute('inputMode', 'decimal')
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
