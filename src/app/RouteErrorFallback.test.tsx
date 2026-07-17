import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouteErrorFallback } from './RouteErrorFallback'

describe('RouteErrorFallback', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a friendly message, not a blank screen', () => {
    render(<RouteErrorFallback />)

    expect(
      screen.getByRole('heading', { name: 'Something went wrong' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/your data is safe/i)).toBeInTheDocument()
  })

  it('reloads the page when the Reload button is clicked', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    const user = userEvent.setup()
    render(<RouteErrorFallback />)

    await user.click(screen.getByRole('button', { name: 'Reload' }))

    expect(reload).toHaveBeenCalledTimes(1)
  })
})
