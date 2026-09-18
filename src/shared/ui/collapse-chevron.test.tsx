import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  CollapseChevronButton,
  CollapseChevronIcon,
} from './collapse-chevron'

describe('CollapseChevron (#967)', () => {
  it('renders the icon with a transparent background and no muted chip', () => {
    const { container } = render(<CollapseChevronIcon expanded />)
    const icon = container.querySelector('[data-slot="collapse-chevron"]')

    expect(icon).toHaveClass('bg-transparent')
    expect(icon?.getAttribute('class')).not.toMatch(/\bbg-muted\b/)
  })

  it('keeps the standalone button transparent even when expanded', () => {
    render(
      <CollapseChevronButton
        expanded
        aria-label="Collapse"
        onClick={() => undefined}
      />,
    )
    const button = screen.getByRole('button', { name: 'Collapse' })

    expect(button).toHaveClass('bg-transparent')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button.className).not.toMatch(/\bbg-muted\b/)
    expect(button).not.toHaveAttribute('data-variant')
  })
})
