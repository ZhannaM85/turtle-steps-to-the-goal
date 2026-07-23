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

    it('fills exactly the number of 10%-segments actually reached, in progressColor', () => {
      render(
        <StatCard
          label="Protein remaining"
          value={60}
          unit="g"
          progressPercent={36}
          progressColor="rgb(1, 2, 3)"
        />,
      )

      const bar = screen.getByRole('progressbar', { name: 'Protein remaining' })
      const segments = bar.children
      expect(segments).toHaveLength(10)
      // 36% -> floor(3.6) = 3 achieved segments, not 4 — a segment only
      // fills once its own full 10%-fraction is actually reached.
      for (let i = 0; i < 3; i++) {
        expect(segments[i]).toHaveStyle({ backgroundColor: 'rgb(1, 2, 3)' })
      }
      for (let i = 3; i < 10; i++) {
        expect(segments[i]).not.toHaveStyle({ backgroundColor: 'rgb(1, 2, 3)' })
      }
    })

    it('fills every segment once at or over goal', () => {
      render(
        <StatCard
          label="Protein remaining"
          value={0}
          unit="g"
          progressPercent={140}
          progressColor="rgb(1, 2, 3)"
        />,
      )

      const bar = screen.getByRole('progressbar', { name: 'Protein remaining' })
      for (const segment of Array.from(bar.children)) {
        expect(segment).toHaveStyle({ backgroundColor: 'rgb(1, 2, 3)' })
      }
    })
  })
})
