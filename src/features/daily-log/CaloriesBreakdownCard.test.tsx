import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CaloriesBreakdownCard } from './CaloriesBreakdownCard'

describe('CaloriesBreakdownCard', () => {
  it('renders all 3 numbers with their labels', () => {
    render(
      <CaloriesBreakdownCard
        label="Remaining calories"
        totalValue="1,500"
        totalLabel="total"
        consumedValue="1,200"
        consumedLabel="consumed"
        remainingValue="300"
        remainingLabel="kcal remaining"
        equationSummary="1,500 total, 1,200 consumed, 300 remaining"
      />,
    )

    expect(screen.getByText('Remaining calories')).toBeInTheDocument()
    expect(screen.getByText('1,500')).toBeInTheDocument()
    expect(screen.getByText('total')).toBeInTheDocument()
    expect(screen.getByText('1,200')).toBeInTheDocument()
    expect(screen.getByText('consumed')).toBeInTheDocument()
    expect(screen.getByText('300')).toBeInTheDocument()
    expect(screen.getByText('kcal remaining')).toBeInTheDocument()
  })

  it('exposes an sr-only sentence summarizing the whole equation', () => {
    render(
      <CaloriesBreakdownCard
        label="Remaining calories"
        totalValue="1,500"
        totalLabel="total"
        consumedValue="1,200"
        consumedLabel="consumed"
        remainingValue="300"
        remainingLabel="kcal remaining"
        equationSummary="1,500 total, 1,200 consumed, 300 remaining"
      />,
    )

    expect(
      screen.getByText('1,500 total, 1,200 consumed, 300 remaining'),
    ).toBeInTheDocument()
  })

  it('renders the progress bar when progressPercent is given', () => {
    render(
      <CaloriesBreakdownCard
        label="Remaining calories"
        totalValue="1,500"
        totalLabel="total"
        consumedValue="1,200"
        consumedLabel="consumed"
        remainingValue="300"
        remainingLabel="kcal remaining"
        equationSummary="1,500 total, 1,200 consumed, 300 remaining"
        progressPercent={80}
      />,
    )

    const bar = screen.getByRole('progressbar', { name: 'Remaining calories' })
    expect(bar).toHaveAttribute('aria-valuenow', '80')
  })

  it('renders no progress bar when progressPercent is not given', () => {
    render(
      <CaloriesBreakdownCard
        label="Remaining calories"
        totalValue="1,500"
        totalLabel="total"
        consumedValue="1,200"
        consumedLabel="consumed"
        remainingValue="300"
        remainingLabel="kcal remaining"
        equationSummary="1,500 total, 1,200 consumed, 300 remaining"
      />,
    )

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
