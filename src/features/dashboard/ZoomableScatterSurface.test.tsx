import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from 'recharts'
import { describe, expect, it } from 'vitest'
import { ZoomableScatterSurface } from './ZoomableScatterSurface'

describe('ZoomableScatterSurface (#581 / #587 / #592 / #593)', () => {
  it('publishes padded full domains when not zoomed (#592/#593)', () => {
    let seenX: [number, number] | undefined
    let seenY: [number, number] | undefined

    render(
      <MemoryRouter>
        <ZoomableScatterSurface
          resetKey="a"
          xValues={[10, 20, 30]}
          yValues={[1, 2, 3]}
        >
          {({ xDomain, yDomain }) => {
            seenX = xDomain
            seenY = yDomain
            return (
              <ResponsiveContainer width={200} height={100}>
                <ScatterChart>
                  <XAxis type="number" dataKey="x" domain={xDomain} />
                  <YAxis type="number" dataKey="y" domain={yDomain} />
                  <Scatter
                    data={[
                      { x: 10, y: 1 },
                      { x: 20, y: 2 },
                      { x: 30, y: 3 },
                    ]}
                    isAnimationActive={false}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            )
          }}
        </ZoomableScatterSurface>
      </MemoryRouter>,
    )

    // 5% pad on [10,30] / [1,3]
    expect(seenX).toEqual([9, 31])
    expect(seenY).toEqual([0.9, 3.1])
  })

  it('includes negative Y in the unzoomed domain (#593)', () => {
    let seenY: [number, number] | undefined

    render(
      <MemoryRouter>
        <ZoomableScatterSurface
          resetKey="neg"
          xValues={[1, 2, 3]}
          yValues={[-1.5, 0.2, 2.2]}
        >
          {({ yDomain }) => {
            seenY = yDomain
            return <div data-testid="neg-y" />
          }}
        </ZoomableScatterSurface>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('neg-y')).toBeInTheDocument()
    expect(seenY).toBeDefined()
    expect(seenY![0]).toBeLessThan(0)
    expect(seenY![1]).toBeGreaterThan(0)
  })

  it('pins unzoomed domains when fullDomainOverride is provided', () => {
    let seenX: [number, number] | undefined
    let seenY: [number, number] | undefined

    render(
      <MemoryRouter>
        <ZoomableScatterSurface
          resetKey="b"
          xValues={[0, 1]}
          yValues={[-0.2, 0.4]}
          fullDomainOverride={{
            xMin: -0.5,
            xMax: 1.5,
            yMin: -1,
            yMax: 1,
          }}
        >
          {({ xDomain, yDomain }) => {
            seenX = xDomain
            seenY = yDomain
            return <div data-testid="chart-slot" />
          }}
        </ZoomableScatterSurface>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('chart-slot')).toBeInTheDocument()
    expect(seenX).toEqual([-0.5, 1.5])
    expect(seenY).toEqual([-1, 1])
  })

  it('keeps domain tuple identity stable across parent re-renders (#587)', () => {
    const domains: Array<[number, number] | undefined> = []

    function Harness({ nonce }: { nonce: number }) {
      return (
        <ZoomableScatterSurface
          resetKey="stable"
          xValues={[0, 1]}
          yValues={[2, 3]}
          fullDomainOverride={{
            xMin: -0.5,
            xMax: 1.5,
            yMin: 0,
            yMax: 5,
          }}
        >
          {({ xDomain }) => {
            domains.push(xDomain)
            return <div data-testid={`n-${nonce}`} />
          }}
        </ZoomableScatterSurface>
      )
    }

    const { rerender } = render(
      <MemoryRouter>
        <Harness nonce={1} />
      </MemoryRouter>,
    )
    rerender(
      <MemoryRouter>
        <Harness nonce={2} />
      </MemoryRouter>,
    )

    expect(domains.length).toBeGreaterThanOrEqual(2)
    expect(domains[0]).toEqual([-0.5, 1.5])
    expect(domains[1]).toBe(domains[0])
  })
})
