import { render, screen, waitFor } from '@testing-library/react'
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

  describe('Reload button (#205, rewritten #649)', () => {
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

    // #649: the previous approach trusted the existing service worker to
    // gracefully self-update via registration.update() + a bounded wait
    // for controllerchange — reported live as getting stuck indefinitely
    // (stale content served even after several reloads), since that
    // depends on the CDN actually serving fresh sw.js bytes on that
    // specific request. reloadForUpdate() now unregisters every
    // registration and clears every cache unconditionally before
    // reloading instead, since useAppUpdateAvailable's separate
    // version.json check has already confirmed a newer deploy exists by
    // the time this ever runs.
    it('unregisters every service worker registration and clears every cache before reloading', async () => {
      stubUpdateFetch()
      const reload = vi.fn()
      vi.stubGlobal('location', { ...window.location, reload })
      const unregister1 = vi.fn()
      const unregister2 = vi.fn()
      stubServiceWorker({
        getRegistrations: vi
          .fn()
          .mockResolvedValue([
            { unregister: unregister1 },
            { unregister: unregister2 },
          ]),
      })
      const cachesDelete = vi.fn().mockResolvedValue(true)
      vi.stubGlobal('caches', {
        keys: vi.fn().mockResolvedValue(['workbox-precache-v1']),
        delete: cachesDelete,
      })

      const user = userEvent.setup()
      render(<AppUpdateBanner />)
      await user.click(await screen.findByRole('button', { name: 'Reload' }))

      await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
      expect(unregister1).toHaveBeenCalledTimes(1)
      expect(unregister2).toHaveBeenCalledTimes(1)
      expect(cachesDelete).toHaveBeenCalledWith('workbox-precache-v1')
    })

    it('shows a loading state and hides the button once clicked, until the reload actually happens (#242)', async () => {
      stubUpdateFetch()
      const reload = vi.fn()
      vi.stubGlobal('location', { ...window.location, reload })
      let resolveUnregister: () => void = () => {}
      const unregister = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveUnregister = resolve
          }),
      )
      stubServiceWorker({
        getRegistrations: vi.fn().mockResolvedValue([{ unregister }]),
      })
      vi.stubGlobal('caches', {
        keys: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
      })

      const user = userEvent.setup()
      render(<AppUpdateBanner />)
      await user.click(await screen.findByRole('button', { name: 'Reload' }))

      expect(
        screen.queryByRole('button', { name: 'Reload' }),
      ).not.toBeInTheDocument()
      expect(screen.getByText('Reloading…')).toBeInTheDocument()
      expect(reload).not.toHaveBeenCalled()

      resolveUnregister()
      await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    })

    it('reloads even if unregister() or caches.delete() throw', async () => {
      stubUpdateFetch()
      const reload = vi.fn()
      vi.stubGlobal('location', { ...window.location, reload })
      stubServiceWorker({
        getRegistrations: vi
          .fn()
          .mockRejectedValue(new Error('network error')),
      })

      const user = userEvent.setup()
      render(<AppUpdateBanner />)
      await user.click(await screen.findByRole('button', { name: 'Reload' }))

      await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    })
  })
})
