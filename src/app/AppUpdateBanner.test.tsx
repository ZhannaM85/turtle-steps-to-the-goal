import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppUpdateBanner } from './AppUpdateBanner'

function stubUpdateFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: 'some-newer-sha' }),
    }),
  )
}

// jsdom has no real Service Worker API at all — `navigator.serviceWorker`
// isn't just unset, the property doesn't exist. Defining it directly on
// the real `navigator` (rather than `vi.stubGlobal('navigator', {...})`,
// which replaces the whole object and can silently drop
// prototype-inherited properties `userEvent` itself relies on internally)
// keeps everything else about the real navigator intact.
function stubServiceWorker(value: unknown) {
  Object.defineProperty(window.navigator, 'serviceWorker', {
    value,
    configurable: true,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  // @ts-expect-error -- test-only cleanup of the stub defined above.
  delete window.navigator.serviceWorker
})

describe('AppUpdateBanner', () => {
  it('renders nothing when the deployed version matches the running one', async () => {
    // __APP_VERSION__ (not a hardcoded 'dev') so this holds regardless of
    // environment — vite.config.ts defines it as `process.env.GITHUB_SHA ??
    // 'dev'`, which is 'dev' locally but the real commit SHA in CI (GitHub
    // Actions always sets GITHUB_SHA), and a hardcoded 'dev' here only
    // matched by accident on machines without that env var set.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: __APP_VERSION__ }),
      }),
    )

    const { container } = render(<AppUpdateBanner />)

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the version check fails (no version.json, e.g. local dev)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const { container } = render(<AppUpdateBanner />)

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the banner once a different deployed version is detected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: 'some-newer-sha' }),
      }),
    )

    render(<AppUpdateBanner />)

    expect(
      await screen.findByText('A new version is available.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })

  it('proactively nudges the service worker to check for itself once an update is detected (#211)', async () => {
    stubUpdateFetch()
    const update = vi.fn().mockResolvedValue(undefined)
    const getRegistration = vi.fn().mockResolvedValue({ update })
    stubServiceWorker({ getRegistration, addEventListener: vi.fn() })

    render(<AppUpdateBanner />)
    await screen.findByRole('button', { name: 'Reload' })

    await waitFor(() => expect(getRegistration).toHaveBeenCalled())
    await waitFor(() => expect(update).toHaveBeenCalled())
  })

  describe('Reload button (#205)', () => {
    it('reloads directly when there is no service worker at all', async () => {
      stubUpdateFetch()
      const reload = vi.fn()
      vi.stubGlobal('location', { ...window.location, reload })
      stubServiceWorker(undefined)

      const user = userEvent.setup()
      render(<AppUpdateBanner />)
      await user.click(await screen.findByRole('button', { name: 'Reload' }))

      expect(reload).toHaveBeenCalledTimes(1)
    })

    it(
      'forces an update check, then reloads anyway once the wait times out with nothing new taking over',
      async () => {
        stubUpdateFetch()
        const reload = vi.fn()
        vi.stubGlobal('location', { ...window.location, reload })
        const update = vi.fn().mockResolvedValue(undefined)
        stubServiceWorker({
          getRegistration: vi.fn().mockResolvedValue({ update }),
          // Never fires — this registration has nothing new to activate.
          addEventListener: vi.fn(),
        })

        render(<AppUpdateBanner />)
        fireEvent.click(await screen.findByRole('button', { name: 'Reload' }))
        await waitFor(() => expect(update).toHaveBeenCalledTimes(1))

        // Reload hasn't happened yet — still within the bounded wait.
        expect(reload).not.toHaveBeenCalled()

        // Real timers throughout — the bounded wait this exercises really
        // is on the order of seconds, and mixing userEvent/testing-library's
        // own waitFor polling with faked timers proved unreliable (both
        // rely on real setTimeout internally unless explicitly told
        // otherwise, in more places than just this component's own code).
        await waitFor(() => expect(reload).toHaveBeenCalledTimes(1), {
          timeout: 7000,
        })
      },
      10000,
    )

    it('reloads as soon as controllerchange fires, without waiting out the full timeout', async () => {
      stubUpdateFetch()
      const reload = vi.fn()
      vi.stubGlobal('location', { ...window.location, reload })
      const update = vi.fn().mockResolvedValue(undefined)
      const addEventListener = vi.fn()
      stubServiceWorker({
        getRegistration: vi.fn().mockResolvedValue({ update }),
        addEventListener,
      })

      const user = userEvent.setup()
      render(<AppUpdateBanner />)
      await user.click(await screen.findByRole('button', { name: 'Reload' }))
      // Wait for the listener to actually be registered, not just for
      // update() to have been called — those are two separate microtask
      // ticks, and firing the handler before it's registered would be a
      // no-op rather than a genuine test of the early-reload path.
      await waitFor(() =>
        expect(addEventListener).toHaveBeenCalledWith(
          'controllerchange',
          expect.any(Function),
          { once: true },
        ),
      )
      expect(reload).not.toHaveBeenCalled()

      const controllerChangeHandler = addEventListener.mock.calls[0][1] as () => void
      controllerChangeHandler()

      await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    })
  })
})
