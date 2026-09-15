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

  it('overlays an action centered on the title line (#888/#907)', () => {
    render(
      <PageHeader
        title="Day"
        overlayAction
        action={<button>Share</button>}
      />,
    )
    const heading = screen.getByRole('heading', { name: 'Day' })
    const action = screen.getByRole('button', { name: 'Share' })
    expect(heading.parentElement?.parentElement?.parentElement).toHaveClass(
      'relative',
      'pr-12',
    )
    expect(action.parentElement).toHaveClass(
      'absolute',
      'top-0',
      'right-0',
      'flex',
      'h-8',
      'items-center',
    )
  })

  it('can stick under the app header (#910)', () => {
    render(<PageHeader title="History" sticky />)
    const heading = screen.getByRole('heading', { name: 'History' })
    expect(heading.parentElement?.parentElement?.parentElement).toHaveClass(
      'sticky',
    )
  })
})
