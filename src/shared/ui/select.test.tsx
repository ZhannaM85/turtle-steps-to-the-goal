import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Label } from './label'
import { Select } from './select'

describe('Select (#736)', () => {
  it('associates with a Label via htmlFor and uses Input chrome', () => {
    render(
      <>
        <Label htmlFor="sort">Sort by</Label>
        <Select id="sort" defaultValue="a">
          <option value="a">A</option>
          <option value="b">B</option>
        </Select>
      </>,
    )

    const select = screen.getByLabelText('Sort by')
    expect(select).toHaveValue('a')
    expect(select).toHaveClass('h-8')
    expect(select).toHaveClass('border-input')
  })
})
