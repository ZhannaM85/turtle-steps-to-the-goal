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

  describe('progress bar (#320)', () => {
    it('renders no progress bar when progressPercent is not given', () => {
      render(<StatCard label="Protein remaining" value={60} unit="g" />)

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    it('renders a progress bar sized to progressPercent', () => {
      render(
        <StatCard
          label="Protein remaining"
          value={60}
          unit="g"
          progressPercent={36}
        />,
      )

      const bar = screen.getByRole('progressbar', { name: 'Protein remaining' })
      expect(bar).toHaveAttribute('aria-valuenow', '36')
    })

    it('clamps aria-valuenow to 100 once over goal', () => {
      render(
        <StatCard
          label="Protein remaining"
          value={0}
          unit="g"
          progressPercent={140}
        />,
      )

      const bar = screen.getByRole('progressbar', { name: 'Protein remaining' })
      expect(bar).toHaveAttribute('aria-valuenow', '100')
    })
  })
})
