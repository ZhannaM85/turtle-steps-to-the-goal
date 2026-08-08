import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reloadForUpdate } from './reloadForUpdate'

function stubServiceWorker(registrations: Array<{ unregister: () => void }>) {
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
    if (originalServiceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker)
    }
    if (originalCaches) {
      Object.defineProperty(window, 'caches', originalCaches)
    }
  })

  it('reloads when there are no service worker registrations or caches', async () => {
    stubServiceWorker([])
    stubCaches([])

    await reloadForUpdate()

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('unregisters every service worker and clears every cache before reloading', async () => {
    const unregister1 = vi.fn()
    const unregister2 = vi.fn()
    stubServiceWorker([
      { unregister: unregister1 },
      { unregister: unregister2 },
    ])
    const caches = stubCaches(['workbox-precache-v1', 'workbox-runtime-v1'])

    await reloadForUpdate()

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
        getRegistrations: vi.fn().mockRejectedValue(new Error('network error')),
      },
    })
    stubCaches([])

    await reloadForUpdate()

    expect(reload).toHaveBeenCalledTimes(1)
  })
})
