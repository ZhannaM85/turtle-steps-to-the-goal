import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TextField } from './text-field'

describe('TextField', () => {
  it('associates the label with the input', () => {
    render(<TextField label="Note" />)
    expect(screen.getByLabelText('Note')).toBeInTheDocument()
  })

  it('links the error message via aria-describedby and aria-invalid', () => {
    render(<TextField label="Note" error="Note is too long" />)
    const input = screen.getByLabelText('Note')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(screen.getByText('Note is too long')).toHaveAttribute(
      'id',
      describedBy,
    )
  })

  it('shows the hint instead of an error when there is no error', () => {
    render(<TextField label="Note" hint="Optional" />)
    expect(screen.getByText('Optional')).toBeInTheDocument()
    expect(screen.getByLabelText('Note')).not.toHaveAttribute('aria-invalid')
  })
})
