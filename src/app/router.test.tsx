import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routes } from './router'

function renderAt(path: string) {
  const memoryRouter = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={memoryRouter} />)
}

describe('app router', () => {
  it('renders the Today screen at /', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument()
  })

  // #102: Dashboard/History/Goal/Settings/About are now lazy-loaded (code
  // splitting), so their headings only appear after the route chunk
  // resolves — findByRole (async) rather than getByRole is required here.
  // Today stays eager (the default route), so it alone can use getByRole.
  it('renders the Dashboard screen at /dashboard', async () => {
    renderAt('/dashboard')
    // Dashboard's chunk is the biggest of the lazy routes (charting
    // library included) — its dynamic import can take longer than
    // findByRole's default 1000ms timeout to transform under Vitest.
    expect(
      await screen.findByRole(
        'heading',
        { name: 'Dashboard' },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument()
  })

  it('renders the History screen at /history', async () => {
    renderAt('/history')
    expect(
      await screen.findByRole('heading', { name: 'History' }),
    ).toBeInTheDocument()
  })

  it('renders the Goal screen at /goal', async () => {
    renderAt('/goal')
    expect(
      await screen.findByRole('heading', { name: 'Goal' }),
    ).toBeInTheDocument()
  })

  it('redirects /export to /settings, where the export section now lives', async () => {
    renderAt('/export')
    expect(
      await screen.findByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Export' })).toBeInTheDocument()
  })

  it('renders the Settings screen at /settings', async () => {
    renderAt('/settings')
    expect(
      await screen.findByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument()
  })

  it('renders the About screen at /about', async () => {
    renderAt('/about')
    expect(
      await screen.findByRole('heading', { name: 'About' }),
    ).toBeInTheDocument()
  })

  it('wires an errorElement so a render crash never falls back to a blank screen (#102)', () => {
    expect(routes[0].errorElement).toBeDefined()
  })

  it('renders the header nav and bottom tab bar on every screen', async () => {
    renderAt('/dashboard')
    await screen.findByRole('heading', { name: 'Dashboard' }, { timeout: 5000 })
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Tabs' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Today' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Settings' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'About' })).toHaveLength(2)
    expect(
      screen.queryByRole('link', { name: 'Export' }),
    ).not.toBeInTheDocument()
  })
})
