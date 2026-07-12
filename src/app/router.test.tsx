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

  it('renders the Dashboard screen at /dashboard', () => {
    renderAt('/dashboard')
    expect(
      screen.getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument()
  })

  it('renders the History screen at /history', () => {
    renderAt('/history')
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument()
  })

  it('renders the Goal screen at /goal', () => {
    renderAt('/goal')
    expect(screen.getByRole('heading', { name: 'Goal' })).toBeInTheDocument()
  })

  it('renders the Export screen at /export', () => {
    renderAt('/export')
    expect(screen.getByRole('heading', { name: 'Export' })).toBeInTheDocument()
  })

  it('renders the Settings screen at /settings', () => {
    renderAt('/settings')
    expect(
      screen.getByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument()
  })

  it('renders the header nav and bottom tab bar on every screen', () => {
    renderAt('/dashboard')
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Tabs' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Today' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Settings' })).toHaveLength(2)
  })
})
