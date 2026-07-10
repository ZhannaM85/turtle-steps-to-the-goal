import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatCard } from './stat-card'

describe('StatCard', () => {
  it('renders the label, value, and unit', () => {
    render(<StatCard label="Today's weight" value={79.5} unit="kg" />)

    expect(screen.getByText("Today's weight")).toBeInTheDocument()
    expect(screen.getByText('79.5')).toBeInTheDocument()
    expect(screen.getByText('kg')).toBeInTheDocument()
  })

  it('renders an optional description', () => {
    render(
      <StatCard
        label="This week"
        value="-0.3"
        unit="kg"
        description="0.3kg from this week's target"
      />,
    )

    expect(
      screen.getByText("0.3kg from this week's target"),
    ).toBeInTheDocument()
  })
})
