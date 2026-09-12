import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TimeInput } from './time-input'

describe('TimeInput', () => {
  it('applies Safari appearance reset and vertical centering (#856/#857/#859)', () => {
    render(<TimeInput aria-label="Time" />)
    const input = screen.getByLabelText('Time')
    expect(input).toHaveAttribute('type', 'time')
    expect(input).toHaveClass(
      'h-12',
      'appearance-none',
      'flex',
      'items-center',
      'leading-normal',
    )
  })

  it('uses a compact box for the Add-meal header clock', () => {
    render(<TimeInput compact aria-label="Time" />)
    const input = screen.getByLabelText('Time')
    expect(input).toHaveClass(
      'h-full',
      'w-24',
      'appearance-none',
      'flex',
      'items-center',
    )
    expect(input).not.toHaveClass('h-12')
  })
})
