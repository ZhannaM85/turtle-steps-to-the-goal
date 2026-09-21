import 'fake-indexeddb/auto'
import { act, render, screen, within } from '@testing-library/react'
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

function expectTabsMounted() {
  expect(screen.getByRole('navigation', { name: 'Tabs' })).toBeInTheDocument()
}

describe('AppShell bottom tab bar stays mounted (#974)', () => {
  it('keeps the bottom tab bar mounted while a text input is focused', async () => {
    const user = userEvent.setup()
    renderShellWithInput()
    expectTabsMounted()

    await user.click(screen.getByLabelText('Weight'))

    expectTabsMounted()
  })

  it('keeps the bottom tab bar mounted after a text input blurs', async () => {
    const user = userEvent.setup()
    renderShellWithInput()

    await user.click(screen.getByLabelText('Weight'))
    await user.click(document.body)

    expectTabsMounted()
  })

  it('registers a click on a button right after a text input blurs (#262)', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    renderShellWithInput(onConfirm)

    await user.click(screen.getByLabelText('Weight'))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expectTabsMounted()
  })

  it('keeps the bottom tab bar mounted for non-text controls like checkboxes', async () => {
    const user = userEvent.setup()
    renderShellWithInput()

    await user.click(screen.getByLabelText('Include'))

    expectTabsMounted()
  })

  it('keeps the bottom tab bar mounted for date inputs', async () => {
    const user = userEvent.setup()
    const router = createMemoryRouter(
      [
        {
          element: <AppShell />,
          children: [
            {
              path: '/',
              element: (
                <div>
                  <label htmlFor="date-field">Date</label>
                  <input id="date-field" type="date" />
                </div>
              ),
            },
          ],
        },
      ],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)

    await user.click(screen.getByLabelText('Date'))

    expectTabsMounted()
  })
})

function mockVisualViewport(initialHeight: number) {
  const listeners: Partial<Record<string, () => void>> = {}
  const viewport = {
    height: initialHeight,
    offsetTop: 0,
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
    scrollTo(height: number, offsetTop = 0) {
      act(() => {
        viewport.height = height
        viewport.offsetTop = offsetTop
        listeners.scroll?.()
      })
    },
  }
}

describe('AppShell bottom tab bar stays mounted on visualViewport change (#974)', () => {
  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', {
      value: undefined,
      configurable: true,
    })
  })

  it('keeps the bottom tab bar mounted when the viewport shrinks', () => {
    const viewport = mockVisualViewport(window.innerHeight)
    renderShellWithInput()
    expectTabsMounted()

    viewport.resizeTo(window.innerHeight - 80)

    const tabs = screen.getByRole('navigation', { name: 'Tabs' })
    expect(tabs).toBeInTheDocument()
    expect(tabs.getAttribute('style') ?? '').not.toContain('translateY')
  })

  it('keeps the bottom tab bar mounted while visualViewport scrolls', () => {
    const viewport = mockVisualViewport(window.innerHeight)
    renderShellWithInput()

    viewport.scrollTo(window.innerHeight - 120, 40)

    const tabs = screen.getByRole('navigation', { name: 'Tabs' })
    expect(tabs).toBeInTheDocument()
    expect(tabs.getAttribute('style') ?? '').not.toContain('translateY')
  })

  it('keeps the bottom tab bar mounted while a text input is focused and the viewport is shrunk', async () => {
    const user = userEvent.setup()
    const viewport = mockVisualViewport(window.innerHeight)
    renderShellWithInput()

    await user.click(screen.getByLabelText('Weight'))
    viewport.resizeTo(window.innerHeight - 300)

    expectTabsMounted()
  })
})

describe('AppShell flex column pins the tab bar (#970)', () => {
  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', {
      value: undefined,
      configurable: true,
    })
  })

  function getTabBar() {
    return screen.getByRole('navigation', { name: 'Tabs' })
  }

  it('keeps the tab bar in document flow, not position fixed', () => {
    renderShellWithInput()
    const tabs = getTabBar()
    expect(tabs).toHaveClass('shrink-0')
    expect(tabs).not.toHaveClass('fixed')
    expect(tabs).not.toHaveClass('bottom-0')
    expect(tabs.getAttribute('style') ?? '').not.toContain('translateY')

    const shell = tabs.parentElement
    expect(shell).toHaveClass('flex', 'h-full', 'flex-col', 'overflow-hidden')

    const main = document.getElementById('main-content')
    expect(main).toBeInstanceOf(HTMLElement)
    expect(main).toHaveClass('flex-1', 'min-h-0', 'overflow-y-auto')
    expect(
      (main as HTMLElement).compareDocumentPosition(tabs) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0)
  })

  it('keeps the in-flow tab bar after visibilitychange and pageshow resume', () => {
    renderShellWithInput()
    const tabs = getTabBar()

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    document.dispatchEvent(new Event('visibilitychange'))
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('pageshow'))

    expect(tabs).toBeInTheDocument()
    expect(tabs).toHaveClass('shrink-0')
    expect(tabs).not.toHaveClass('fixed')
    expect(tabs.getAttribute('style') ?? '').not.toContain('translateY')
  })

  it('does not translate the tab bar when visualViewport height changes after resume', () => {
    const viewport = mockVisualViewport(window.innerHeight)
    renderShellWithInput()

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    document.dispatchEvent(new Event('visibilitychange'))
    viewport.resizeTo(window.innerHeight - 160)

    const tabs = getTabBar()
    expect(tabs).toBeInTheDocument()
    expect(tabs).toHaveClass('shrink-0')
    expect(tabs).not.toHaveClass('fixed')
    expect(tabs.getAttribute('style') ?? '').not.toContain('translateY')
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
    const main = document.getElementById('main-content')
    expect(main).toBeTruthy()
    if (main) main.scrollTop = 320
    // The mount-time call doesn't count — only a real navigation should
    // trigger this.
    scrollToSpy.mockClear()

    await user.click(screen.getByRole('link', { name: 'Go' }))

    expect(await screen.findByText('Other page')).toBeInTheDocument()
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0)
    expect(main?.scrollTop).toBe(0)
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

describe('AppShell bottom tab active accent (#484, #493)', () => {
  it('marks the active tab with an inner pill around icon+label, not a full-height slab', () => {
    renderShellWithInput()

    const tabs = screen.getByRole('navigation', { name: 'Tabs' })
    const dayTab = within(tabs).getByRole('link', { name: 'Day' })
    // #493 — the link itself stays a tall tap target without bg-muted;
    // the visible selected treatment lives on the inner pill.
    expect(dayTab).not.toHaveClass('bg-muted')
    expect(dayTab).toHaveClass('min-h-20')
    const dayPill = dayTab.querySelector('span')
    expect(dayPill).toHaveClass('bg-muted', 'text-primary', 'rounded-2xl')

    const dashboardTab = within(tabs).getByRole('link', {
      name: 'Dashboard',
    })
    const dashboardPill = dashboardTab.querySelector('span')
    expect(dashboardPill).toHaveClass('text-muted-foreground')
    expect(dashboardPill).not.toHaveClass('bg-muted')
    expect(dashboardPill).not.toHaveClass('text-primary')
  })
})
