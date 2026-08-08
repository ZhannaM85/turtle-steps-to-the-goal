import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reloadForUpdate } from './reloadForUpdate'

function stubServiceWorkerRegistration(registration: unknown) {
  const addEventListener = vi.fn()
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue(registration),
      addEventListener,
    },
  })
  return addEventListener
}

function stubServiceWorkerRegistrations(
  registrations: Array<{ unregister: () => void }>,
) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistrations: vi.fn().mockResolvedValue(registrations),
    },
  })
}

function stubCaches(keys: string[]) {
  Object.defineProperty(window, 'caches', {
    configurable: true,
    value: {
      keys: vi.fn().mockResolvedValue(keys),
      delete: vi.fn().mockResolvedValue(true),
    },
  })
  return window.caches
}

describe('reloadForUpdate', () => {
  const originalServiceWorker = Object.getOwnPropertyDescriptor(
    navigator,
    'serviceWorker',
  )
  const originalCaches = Object.getOwnPropertyDescriptor(window, 'caches')
  let reload: ReturnType<typeof vi.fn>

  beforeEach(() => {
    reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    if (originalServiceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker)
    }
    if (originalCaches) {
      Object.defineProperty(window, 'caches', originalCaches)
    }
  })

  describe('default (no force) — pull-to-refresh and any other non-update-confirmed caller', () => {
    it('reloads immediately when there is no service worker registration', async () => {
      stubServiceWorkerRegistration(null)

      await reloadForUpdate()

      expect(reload).toHaveBeenCalledTimes(1)
    })

    // #270: registration.update() resolving with neither `installing` nor
    // `waiting` set means nothing new was found — there's nothing that will
    // ever fire controllerchange, so waiting out the full timeout here was
    // pure wasted time on every no-op update check.
    it('skips the controllerchange wait entirely when update() finds nothing new', async () => {
      vi.useFakeTimers()
      const addEventListener = stubServiceWorkerRegistration({
        update: vi.fn().mockResolvedValue(undefined),
        installing: null,
        waiting: null,
      })

      const done = vi.fn()
      reloadForUpdate().then(done)
      await vi.waitFor(() => expect(done).toHaveBeenCalled())

      expect(reload).toHaveBeenCalledTimes(1)
      expect(addEventListener).not.toHaveBeenCalled()
    })

    it('waits for controllerchange (bounded by the timeout) when a new worker is installing', async () => {
      vi.useFakeTimers()
      stubServiceWorkerRegistration({
        update: vi.fn().mockResolvedValue(undefined),
        installing: {},
        waiting: null,
      })

      const done = vi.fn()
      reloadForUpdate().then(done)
      await vi.advanceTimersByTimeAsync(0)
      expect(done).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(5000)
      await vi.waitFor(() => expect(done).toHaveBeenCalled())
      expect(reload).toHaveBeenCalledTimes(1)
    })

    it('reloads even if registration.update() throws', async () => {
      stubServiceWorkerRegistration({
        update: vi.fn().mockRejectedValue(new Error('network error')),
        installing: null,
        waiting: null,
      })

      await reloadForUpdate()

      expect(reload).toHaveBeenCalledTimes(1)
    })

    // #652 — the actual regression this split fixes: a routine pull-to-
    // refresh must never destroy the offline-capable precache.
    it('never unregisters the service worker or clears caches', async () => {
      const unregister = vi.fn()
      stubServiceWorkerRegistration({
        update: vi.fn().mockResolvedValue(undefined),
        installing: null,
        waiting: null,
        unregister,
      })
      const caches = stubCaches(['workbox-precache-v1'])

      await reloadForUpdate()

      expect(unregister).not.toHaveBeenCalled()
      expect(caches.delete).not.toHaveBeenCalled()
    })
  })

  describe('force: true — only AppUpdateBanner, where an update is confirmed', () => {
    it('reloads when there are no service worker registrations or caches', async () => {
      stubServiceWorkerRegistrations([])
      stubCaches([])

      await reloadForUpdate({ force: true })

      expect(reload).toHaveBeenCalledTimes(1)
    })

    it('unregisters every service worker and clears every cache before reloading', async () => {
      const unregister1 = vi.fn()
      const unregister2 = vi.fn()
      stubServiceWorkerRegistrations([
        { unregister: unregister1 },
        { unregister: unregister2 },
      ])
      const caches = stubCaches(['workbox-precache-v1', 'workbox-runtime-v1'])

      await reloadForUpdate({ force: true })

      expect(unregister1).toHaveBeenCalledTimes(1)
      expect(unregister2).toHaveBeenCalledTimes(1)
      expect(caches.delete).toHaveBeenCalledWith('workbox-precache-v1')
      expect(caches.delete).toHaveBeenCalledWith('workbox-runtime-v1')
      expect(reload).toHaveBeenCalledTimes(1)
    })

    it('reloads even if getRegistrations() throws', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          getRegistrations: vi
            .fn()
            .mockRejectedValue(new Error('network error')),
        },
      })
      stubCaches([])

      await reloadForUpdate({ force: true })

      expect(reload).toHaveBeenCalledTimes(1)
    })
  })
})
