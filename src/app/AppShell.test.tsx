import 'fake-indexeddb/auto'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'

function renderShellWithInput(onConfirm?: () => void) {
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
                <button type="button" onClick={onConfirm}>
                  Confirm
                </button>
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

    // #262: the re-check on blur is now deliberately delayed (see
    // useIsTextInputFocused.ts) so the bar can't reappear mid-gesture and
    // swallow a same-click tap on whatever control the user is actually
    // pressing — findBy (async) rather than a synchronous assertion.
    expect(
      await screen.findByRole('navigation', { name: 'Tabs' }),
    ).toBeInTheDocument()
  })

  it('registers a click on a button right after a text input blurs, and shows the tab bar again (#262)', async () => {
    // #262's real root cause: focus landing on the clicked button (not
    // just focus *leaving* the input) used to synchronously flip the
    // bar's visibility state mid-click, before that same click's mouseup
    // was dispatched — a jsdom click() can't reproduce the actual lost
    // event (no real hit-testing/paint), but it can confirm the fix
    // didn't break the button's own click handler or the bar's eventual
    // reappearance.
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    renderShellWithInput(onConfirm)

    await user.click(screen.getByLabelText('Weight'))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(
      await screen.findByRole('navigation', { name: 'Tabs' }),
    ).toBeInTheDocument()
  })

  it('does not hide the bottom tab bar for non-text controls like checkboxes', async () => {
    const user = userEvent.setup()
    renderShellWithInput()

    await user.click(screen.getByLabelText('Include'))

    expect(screen.getByRole('navigation', { name: 'Tabs' })).toBeInTheDocument()
  })
})

// #188: a second, independent signal alongside focus-tracking above — the
// visual viewport shrinking (on-screen keyboard opening, or still
// mid-animation) is detected directly rather than only inferred from
// which element has DOM focus.
function mockVisualViewport(initialHeight: number) {
  const listeners: Partial<Record<string, () => void>> = {}
  const viewport = {
    height: initialHeight,
    addEventListener: (event: string, fn: () => void) => {
      listeners[event] = fn
    },
    removeEventListener: vi.fn(),
  }
  Object.defineProperty(window, 'visualViewport', {
    value: viewport,
    configurable: true,
  })
  return {
    resizeTo(height: number) {
      act(() => {
        viewport.height = height
        listeners.resize?.()
      })
    },
  }
}

describe('AppShell bottom tab bar visibility, viewport-shrink signal (#188)', () => {
  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', {
      value: undefined,
      configurable: true,
    })
  })

  it('hides the bottom tab bar once the visual viewport shrinks, with no input focused', () => {
    const viewport = mockVisualViewport(window.innerHeight)
    renderShellWithInput()
    expect(screen.getByRole('navigation', { name: 'Tabs' })).toBeInTheDocument()

    viewport.resizeTo(window.innerHeight - 300)

    expect(
      screen.queryByRole('navigation', { name: 'Tabs' }),
    ).not.toBeInTheDocument()
  })

  it('shows the bottom tab bar again once the viewport resizes back to full height', () => {
    const viewport = mockVisualViewport(window.innerHeight)
    renderShellWithInput()

    viewport.resizeTo(window.innerHeight - 300)
    expect(
      screen.queryByRole('navigation', { name: 'Tabs' }),
    ).not.toBeInTheDocument()

    viewport.resizeTo(window.innerHeight)

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
