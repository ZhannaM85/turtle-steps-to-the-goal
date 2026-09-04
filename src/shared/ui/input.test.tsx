import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Input } from './input'

describe('Input', () => {
  it('does not add vertical padding that detaches the caret on tall fields (#808)', () => {
    render(<Input aria-label="Quantity" />)
    const input = screen.getByLabelText('Quantity')
    expect(input).toHaveClass('py-0')
    expect(input).toHaveClass('leading-normal')
    expect(input).not.toHaveClass('py-1')
  })
})
