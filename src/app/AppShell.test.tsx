import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
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
