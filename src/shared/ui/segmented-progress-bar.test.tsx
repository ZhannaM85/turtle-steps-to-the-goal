import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SegmentedProgressBar } from './segmented-progress-bar'

describe('SegmentedProgressBar', () => {
  it('fills exactly the number of 10%-segments actually reached, in color', () => {
    render(
      <SegmentedProgressBar percent={36} color="rgb(1, 2, 3)" label="Protein" />,
    )

    const bar = screen.getByRole('progressbar', { name: 'Protein' })
    expect(bar).toHaveAttribute('aria-valuenow', '36')
    const segments = bar.children
    expect(segments).toHaveLength(10)
    // 36% -> floor(3.6) = 3 achieved segments, not 4.
    for (let i = 0; i < 3; i++) {
      expect(segments[i]).toHaveStyle({ backgroundColor: 'rgb(1, 2, 3)' })
    }
    for (let i = 3; i < 10; i++) {
      expect(segments[i]).not.toHaveStyle({ backgroundColor: 'rgb(1, 2, 3)' })
    }
  })

  it('fills every segment once at or over goal', () => {
    render(
      <SegmentedProgressBar percent={140} color="rgb(1, 2, 3)" label="Protein" />,
    )

    const bar = screen.getByRole('progressbar', { name: 'Protein' })
    expect(bar).toHaveAttribute('aria-valuenow', '100')
    for (const segment of Array.from(bar.children)) {
      expect(segment).toHaveStyle({ backgroundColor: 'rgb(1, 2, 3)' })
    }
  })
})
