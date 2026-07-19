import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'

function renderShellWithInput() {
  const router = createMemoryRouter(
    [
      {
        element: <AppShell />,
        children: [
          {
            path: '/',
            element: (
              <div>
                <label htmlFor="text-field">Weight</label>
                <input id="text-field" type="text" />
                <label htmlFor="checkbox-field">Include</label>
                <input id="checkbox-field" type="checkbox" />
              </div>
            ),
          },
        ],
      },
    ],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
}

describe('AppShell bottom tab bar visibility (#120)', () => {
  it('hides the bottom tab bar while a text input is focused', async () => {
    const user = userEvent.setup()
    renderShellWithInput()
    expect(screen.getByRole('navigation', { name: 'Tabs' })).toBeInTheDocument()

    await user.click(screen.getByLabelText('Weight'))

    expect(
      screen.queryByRole('navigation', { name: 'Tabs' }),
    ).not.toBeInTheDocument()
  })

  it('shows the bottom tab bar again once the text input blurs', async () => {
    const user = userEvent.setup()
    renderShellWithInput()

    await user.click(screen.getByLabelText('Weight'))
    expect(
      screen.queryByRole('navigation', { name: 'Tabs' }),
    ).not.toBeInTheDocument()

    await user.click(document.body)

    expect(screen.getByRole('navigation', { name: 'Tabs' })).toBeInTheDocument()
  })

  it('does not hide the bottom tab bar for non-text controls like checkboxes', async () => {
    const user = userEvent.setup()
    renderShellWithInput()

    await user.click(screen.getByLabelText('Include'))

    expect(screen.getByRole('navigation', { name: 'Tabs' })).toBeInTheDocument()
  })
})

describe('scroll to top on navigation (#185)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('scrolls to top when the route pathname changes', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const user = userEvent.setup()
    const router = createMemoryRouter(
      [
        {
          element: <AppShell />,
          children: [
            { path: '/', element: <Link to="/other">Go</Link> },
            { path: '/other', element: <div>Other page</div> },
          ],
        },
      ],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)
    // The mount-time call doesn't count — only a real navigation should
    // trigger this.
    scrollToSpy.mockClear()

    await user.click(screen.getByRole('link', { name: 'Go' }))

    expect(await screen.findByText('Other page')).toBeInTheDocument()
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0)
  })

  it('does not scroll to top when only search params change on the same route', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const user = userEvent.setup()
    const router = createMemoryRouter(
      [
        {
          element: <AppShell />,
          children: [{ path: '/', element: <Link to="/?filter=x">Go</Link> }],
        },
      ],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)
    scrollToSpy.mockClear()

    await user.click(screen.getByRole('link', { name: 'Go' }))

    expect(scrollToSpy).not.toHaveBeenCalled()
  })
})
