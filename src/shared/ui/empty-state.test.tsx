import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(
      <EmptyState
        title="No entries yet"
        description="Log today's weight to get started"
      />,
    )

    expect(screen.getByText('No entries yet')).toBeInTheDocument()
    expect(
      screen.getByText("Log today's weight to get started"),
    ).toBeInTheDocument()
  })

  it('hides a decorative icon from assistive tech', () => {
    render(
      <EmptyState title="No entries yet" icon={<svg data-testid="icon" />} />,
    )

    expect(screen.getByTestId('icon').parentElement).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })

  it('renders an action', () => {
    render(
      <EmptyState
        title="No entries yet"
        action={<button>Set a goal</button>}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Set a goal' }),
    ).toBeInTheDocument()
  })
})
