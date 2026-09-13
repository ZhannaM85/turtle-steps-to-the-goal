import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NoticeBar } from './notice-bar'

describe('NoticeBar (#875)', () => {
  it('renders confirm chrome without a status role', () => {
    render(
      <NoticeBar variant="confirm" actions={<button>Yes</button>}>
        Delete this entry?
      </NoticeBar>,
    )
    const bar = screen.getByText('Delete this entry?').closest('[data-variant]')
    expect(bar).toHaveAttribute('data-variant', 'confirm')
    expect(bar).toHaveClass('bg-muted')
    expect(bar).not.toHaveAttribute('role', 'status')
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument()
  })

  it('marks undo as a status', () => {
    render(
      <NoticeBar variant="undo" role="status" actions={<button>Undo</button>}>
        Meal deleted
      </NoticeBar>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Meal deleted')
  })
})
