import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CorrelationChartTooltip } from './CorrelationChartTooltip'

// The shape Recharts 3 builds for a Scatter point: one entry per axis, each
// carrying the whole `data` object it came from (see Scatter.js's own
// tooltipPayload construction).
function payloadFor(date: string | undefined) {
  return [
    {
      name: 'steps',
      value: 9000,
      dataKey: 'steps',
      payload: { date, steps: 9000, delta: -0.2 },
    },
    {
      name: 'next-day change',
      value: -0.2,
      dataKey: 'delta',
      payload: { date, steps: 9000, delta: -0.2 },
    },
  ]
}

const formatValue = (value: number, name: string) =>
  name === 'steps' ? String(value) : `${value} kg`

function renderTooltip(ui: React.ReactElement) {
  return render(ui, { wrapper: MemoryRouter })
}

describe('CorrelationChartTooltip', () => {
  it('renders every axis value through the view-supplied formatter', () => {
    renderTooltip(
      <CorrelationChartTooltip
        formatValue={formatValue}
        active
        payload={payloadFor('2026-03-01')}
      />,
    )

    expect(screen.getByText('steps: 9000')).toBeInTheDocument()
    expect(screen.getByText('next-day change: -0.2 kg')).toBeInTheDocument()
  })

  it('links to the point day (#489)', () => {
    renderTooltip(
      <CorrelationChartTooltip
        formatValue={formatValue}
        active
        payload={payloadFor('2026-03-01')}
      />,
    )

    expect(screen.getByText('Mar 1, 2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View this day/ })).toHaveAttribute(
      'href',
      '/?date=2026-03-01',
    )
  })

  it('omits the link for a point with no resolvable calendar date', () => {
    renderTooltip(
      <CorrelationChartTooltip
        formatValue={formatValue}
        active
        payload={payloadFor(undefined)}
      />,
    )

    expect(screen.getByText('steps: 9000')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders nothing while the tooltip is inactive', () => {
    const { container } = renderTooltip(
      <CorrelationChartTooltip
        formatValue={formatValue}
        payload={payloadFor('2026-03-01')}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
