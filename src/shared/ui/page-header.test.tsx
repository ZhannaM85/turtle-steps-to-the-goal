import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageHeader } from './page-header'

describe('PageHeader', () => {
  it('renders the title as a level-1 heading', () => {
    render(<PageHeader title="Dashboard" />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeInTheDocument()
  })

  it('renders an optional description and action', () => {
    render(
      <PageHeader
        title="Dashboard"
        description="Your trends at a glance"
        action={<button>Export</button>}
      />,
    )

    expect(screen.getByText('Your trends at a glance')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
  })
})
